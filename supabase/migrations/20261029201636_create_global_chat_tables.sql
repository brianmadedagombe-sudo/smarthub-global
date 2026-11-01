/*
# Create global chat tables with founder roles and rate limiting

1. New Tables
- `chat_messages`: public global chat messages. Each row stores a display name, a message body (1-500 characters), the sender role ('member' or 'founder'), and a timestamp.
- `chat_founders`: the list of signed-in accounts that receive the Founder role. Only the database owner can change it.

2. Behaviour
- The database fills in the sender's verified account ID and role on insert. Clients cannot choose either value.
- Guests (not signed in) send messages with a random device key that is never readable back.
- Each sender may post at most 5 messages in any 10-second window; extra attempts are rejected.

3. Security
- Row level security is enabled on both tables.
- `chat_messages`: anyone may read the public columns and insert. No update or delete is allowed.
- The guest key column is write-only and is never returned to the browser.
- `chat_founders`: no access for browser roles. Only server-side tools can read or change it.
- The trigger function is not callable directly by any browser role.

4. Realtime
- `chat_messages` is added to the realtime publication so new messages appear live.

5. Notes
- Founder status is granted by adding an account ID to `chat_founders` from the server side.
- Rate limiting is per sender identity. A determined user can create new guest keys to bypass it; this is accepted for a public chat.
*/

CREATE TABLE IF NOT EXISTS chat_founders (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_founders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_key text CHECK (guest_key IS NULL OR char_length(guest_key) BETWEEN 16 AND 64),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 24),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  sender_role text NOT NULL DEFAULT 'member' CHECK (sender_role IN ('member', 'founder')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR guest_key IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_user_recent_idx ON chat_messages (user_id, created_at);
CREATE INDEX IF NOT EXISTS chat_messages_guest_recent_idx ON chat_messages (guest_key, created_at);

CREATE OR REPLACE FUNCTION chat_messages_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  NEW.user_id := auth.uid();

  IF NEW.user_id IS NULL AND NEW.guest_key IS NULL THEN
    RAISE EXCEPTION 'Missing sender identity';
  END IF;

  SELECT count(*) INTO recent_count
  FROM chat_messages
  WHERE created_at > now() - interval '10 seconds'
    AND (
      (NEW.user_id IS NOT NULL AND chat_messages.user_id = NEW.user_id)
      OR (NEW.user_id IS NULL AND chat_messages.guest_key = NEW.guest_key)
    );

  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many messages';
  END IF;

  NEW.sender_role := CASE
    WHEN NEW.user_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM chat_founders f WHERE f.user_id = NEW.user_id
    ) THEN 'founder'
    ELSE 'member'
  END;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION chat_messages_before_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS chat_messages_before_insert ON chat_messages;
CREATE TRIGGER chat_messages_before_insert
  BEFORE INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION chat_messages_before_insert();

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT (id, display_name, body, sender_role, created_at) ON chat_messages TO anon, authenticated;
GRANT INSERT (display_name, body, guest_key) ON chat_messages TO anon, authenticated;

DROP POLICY IF EXISTS "chat_messages_select_public" ON chat_messages;
CREATE POLICY "chat_messages_select_public" ON chat_messages
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "chat_messages_insert_public" ON chat_messages;
CREATE POLICY "chat_messages_insert_public" ON chat_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;
