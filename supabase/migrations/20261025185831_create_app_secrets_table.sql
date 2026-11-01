/*
# Create app_secrets table for edge function key storage

1. Purpose
   - Stores the GEMINI_API_KEY in a dedicated table that the edge function
     reads at runtime using the service role key. This keeps the key out of
     the client bundle while remaining accessible server-side.

2. Tables
   - `app_secrets`: key-value store for server-side secrets.
     - `name` (text, primary key): the secret identifier
     - `value` (text, not null): the secret value
     - `created_at` (timestamptz): timestamp

3. Security
   - RLS enabled, deny-by-default for anon and authenticated.
   - Only service_role can read (it bypasses RLS).
   - The edge function uses SUPABASE_SERVICE_ROLE_KEY to query this table.
   - No client-side access whatsoever.
*/

CREATE TABLE IF NOT EXISTS app_secrets (
  name text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;

-- No GRANT to anon or authenticated — the edge function uses service_role
-- which bypasses RLS. Grant only to service_role for explicitness.
GRANT SELECT ON app_secrets TO service_role;

-- Clean up the vault approach — remove the unused vault secret to avoid confusion.
DELETE FROM vault.secrets WHERE name = 'GEMINI_API_KEY';

INSERT INTO app_secrets (name, value)
VALUES ('GEMINI_API_KEY', 'PLACEHOLDER_SET_VIA_DASHBOARD')
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, created_at = now();
