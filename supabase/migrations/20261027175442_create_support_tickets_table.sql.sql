/*
# Create support_tickets table

1. New Tables
- `support_tickets`
  - `id` (uuid, primary key)
  - `name` (text, name of the person requesting help — not displayed publicly)
  - `reply_to` (text, optional email for follow-up — masked from public UI)
  - `subject` (text, short topic)
  - `message` (text, the support request body)
  - `status` (text, one of 'open' | 'in_progress' | 'resolved'; default 'open')
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `support_tickets`.
- Grant INSERT to `anon, authenticated` so the in-app support form can submit.
- Grant SELECT to `authenticated` so a signed-in owner/staff can view tickets.
- `anon` can only INSERT (cannot read other people's tickets).
- No UPDATE/DELETE grants for client roles — status changes are server-side only.

3. Notes
- This is a no-auth public app: the support form runs as `anon`.
- Raw contact details are never exposed in the public UI; they live only in this table.
*/

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  reply_to text,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

GRANT INSERT ON support_tickets TO anon, authenticated;
GRANT SELECT ON support_tickets TO authenticated;

DROP POLICY IF EXISTS "anon_insert_support_ticket" ON support_tickets;
CREATE POLICY "anon_insert_support_ticket"
ON support_tickets FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_support_tickets" ON support_tickets;
CREATE POLICY "authenticated_read_support_tickets"
ON support_tickets FOR SELECT
TO authenticated
USING (true);
