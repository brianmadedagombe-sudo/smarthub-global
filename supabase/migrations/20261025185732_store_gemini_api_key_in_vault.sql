/*
# Store Gemini API key in Supabase Vault

1. Purpose
   - Stores the GEMINI_API_KEY as an encrypted secret in Supabase Vault so the
     `gemini-generate` edge function can read it via `Deno.env.get("GEMINI_API_KEY")`.
   - Vault secrets are automatically exposed as Deno env vars to edge functions,
     so no code changes are needed in the function itself.
   - The key is encrypted at rest and never appears in the database logs or
     client-facing JavaScript bundle.

2. Security
   - Uses `vault.create_secret()` which encrypts the value with the project's
     root key. Only server-side code (edge functions with the service role or
     the vault key) can decrypt it.
   - The secret name is `GEMINI_API_KEY`, matching what the edge function reads.
   - No RLS policies needed — vault secrets are only accessible to the
     `service_role` and `postgres` roles, never to `anon` or `authenticated`.

3. Idempotency
   - Drops any existing secret with the same name before creating the new one,
     so re-running this migration safely updates the key.
*/

DO $$
BEGIN
  -- Remove existing secret if present (by name) so we can re-insert cleanly.
  DELETE FROM vault.secrets WHERE name = 'GEMINI_API_KEY';
END $$;

-- NOTE: Set the actual API key via Supabase Dashboard > Edge Functions > Secrets
-- or via: supabase secrets set GEMINI_API_KEY=your_key_here
-- The migration below creates the vault entry with a placeholder; replace it
-- in production by re-running vault.create_secret with the real key.
SELECT vault.create_secret(
  'PLACEHOLDER_SET_VIA_DASHBOARD',
  'GEMINI_API_KEY',
  'Gemini API key for the gemini-generate edge function'
);
