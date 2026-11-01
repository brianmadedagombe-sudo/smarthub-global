/*
# Create tournament registrations

1. New Tables
- `tournament_registrations`: one row per player registration.
  - `id` (uuid, primary key)
  - `wallet_id` (uuid, the player's wallet; cascades on wallet delete)
  - `tournament_ref` (text, nullable; the official tournament id, null for custom community registrations)
  - `game`, `ign`, `player_id`, `squad_id`, `contact` (text)
  - `created_at` (timestamptz)
2. Security
- RLS enabled with no policies, so anon and authenticated roles cannot read or write directly.
- Only the service role is granted access; the tournament edge function checks the wallet signature before touching rows.
3. Notes
- A partial unique index stops the same wallet from registering twice for the same official tournament.
*/

CREATE TABLE IF NOT EXISTS tournament_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  tournament_ref text,
  game text NOT NULL,
  ign text NOT NULL,
  player_id text NOT NULL DEFAULT '',
  squad_id text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tournament_registrations_wallet_idx ON tournament_registrations (wallet_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS tournament_registrations_wallet_tournament_uidx
  ON tournament_registrations (wallet_id, tournament_ref)
  WHERE tournament_ref IS NOT NULL;

ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON tournament_registrations TO service_role;
