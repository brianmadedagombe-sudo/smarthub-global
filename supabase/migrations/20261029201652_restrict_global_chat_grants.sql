/*
# Restrict browser access on global chat tables

1. Modified Tables
- `chat_messages`: removes the default full-table privileges given to browser roles. Only the public columns (display name, body, sender role, timestamp, id) remain readable, and only display name, body, and guest key can be inserted.
- `chat_founders`: removes all browser-role privileges. Only server-side access remains.

2. Security
- Stops the guest key column from being readable by anonymous or signed-in browsers.
- Stops browsers from updating or deleting chat messages or founder entries.
- Existing row level security policies are unchanged.

3. Notes
- Re-applying this migration is safe; the revoke and grant statements are idempotent.
*/

REVOKE ALL ON chat_messages FROM anon, authenticated;
GRANT SELECT (id, display_name, body, sender_role, created_at) ON chat_messages TO anon, authenticated;
GRANT INSERT (display_name, body, guest_key) ON chat_messages TO anon, authenticated;

REVOKE ALL ON chat_founders FROM anon, authenticated;
