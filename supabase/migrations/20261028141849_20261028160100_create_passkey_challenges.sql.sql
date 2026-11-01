/*
# Passkey challenge store

Plain-English summary: stores WebAuthn challenge bytes for in-flight
registration and authentication ceremonies. Each challenge is single-use
and expires after 5 minutes. The passkey-auth edge function writes a
challenge here, the browser signs it, and the edge function verifies and
deletes it.

1. New Tables
- `passkey_challenges`: single-use WebAuthn challenges.
  - `id` (uuid, primary key — the challenge ID sent to the browser)
  - `challenge` (bytea — the raw challenge bytes the authenticator signs)
  - `user_id` (uuid, nullable — set during registration, null during login)
  - `purpose` (text — 'registration' or 'authentication')
  - `created_at` (timestamptz)
  - `used` (boolean, default false — prevents replay)

2. Security
- RLS enabled. No anon or authenticated access — only the service role
  (used by the edge function) can read/write challenges. The browser
  never touches this table directly.

3. Important Notes
- Challenges expire after 5 minutes and are cleaned up lazily.
- Each challenge can only be verified once (the `used` flag).
*/

CREATE TABLE IF NOT EXISTS passkey_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge bytea NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('registration', 'authentication')),
  created_at timestamptz NOT NULL DEFAULT now(),
  used boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS passkey_challenges_id_idx ON passkey_challenges (id);

ALTER TABLE passkey_challenges ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON passkey_challenges FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON passkey_challenges TO service_role;
