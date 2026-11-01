/*
# Passkey (WebAuthn) credential storage

Plain-English summary: adds a `passkey_credentials` table that stores WebAuthn
public-key credentials for each user, so users can sign in with passkeys
(Face ID, Touch ID, YubiKey, phone screen lock) instead of passwords. Each
user can register multiple passkeys (e.g. phone + laptop).

1. New Tables
- `passkey_credentials`: one row per registered passkey credential.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references `auth.users`, cascades on delete)
  - `credential_id` (bytea, unique — the WebAuthn credential ID)
  - `public_key` (bytea — the COSE public key)
  - `sign_count` (bigint — replay-protection counter, starts at 0)
  - `transports` (text[] — authenticator transports: internal, hybrid, usb, nfc)
  - `device_label` (text — optional friendly name like "iPhone Face ID")
  - `created_at` (timestamptz)

2. Security
- RLS enabled on `passkey_credentials`.
- `authenticated` users can SELECT/INSERT/UPDATE/DELETE only their own
  passkey rows (ownership via `auth.uid() = user_id`).
- `service_role` (used by the passkey-auth edge function) can read/write
  all rows — the edge function needs cross-user access to look up a
  credential by its ID during authentication (the browser doesn't know
  the user's UUID until after the passkey is verified).
- No `anon` access — passkey operations go through the edge function
  (which uses the service role key) or through the authenticated client.

3. Important Notes
- The `passkey_credentials` table is deliberately accessible to the
  service role for the credential-lookup step: during login the browser
  sends a raw credential ID, and the edge function must find which user
  that credential belongs to before it can verify the assertion.
- `sign_count` is updated on each successful authentication to detect
  cloned authenticators (if the reported count is lower than the stored
  count, the authenticator may have been cloned).
*/

CREATE TABLE IF NOT EXISTS passkey_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id bytea NOT NULL UNIQUE,
  public_key bytea NOT NULL,
  sign_count bigint NOT NULL DEFAULT 0,
  transports text[] NOT NULL DEFAULT '{}',
  device_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS passkey_credentials_user_idx ON passkey_credentials (user_id);
CREATE INDEX IF NOT EXISTS passkey_credentials_credential_id_idx ON passkey_credentials (credential_id);

ALTER TABLE passkey_credentials ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON passkey_credentials FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON passkey_credentials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON passkey_credentials TO service_role;

DROP POLICY IF EXISTS "select_own_passkeys" ON passkey_credentials;
CREATE POLICY "select_own_passkeys"
  ON passkey_credentials FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_passkeys" ON passkey_credentials;
CREATE POLICY "insert_own_passkeys"
  ON passkey_credentials FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_passkeys" ON passkey_credentials;
CREATE POLICY "update_own_passkeys"
  ON passkey_credentials FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_passkeys" ON passkey_credentials;
CREATE POLICY "delete_own_passkeys"
  ON passkey_credentials FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
