/*
# Dual wallet ledger (Hub Coins and Earned Cash)

Plain-English summary: every device gets a server-side wallet with two separate balances. Hub Coins are an in-app utility currency (tips, tournament entries) and can never be withdrawn. Earned Cash is real withdrawable revenue and can only leave the wallet through a payout request. Every balance change is recorded in an append-only ledger.

1. New Tables
- `wallets`: one row per device wallet. `hub_coins` and `earned_cash_kes` are both non-negative. `hmac_key` is the server-side signing secret used to verify each request.
- `wallet_ledger`: append-only history of every balance change, with the balance left after each change.
- `wallet_nonces`: request nonces already used, so a captured signed request cannot be replayed.
- `payout_requests`: Earned Cash withdrawals waiting for an M-Pesa payout. Minimum KES 500.

2. New Functions
- `apply_wallet_entry`: changes one balance and writes its ledger row in a single step. Refuses any change that would take a balance below zero.
- `request_wallet_payout`: debits Earned Cash and creates a payout request in a single step.

3. Security
- Row level security is enabled on all four tables with no policies, and no access is granted to the anonymous or signed-in browser roles. Browsers cannot read or change balances directly.
- Only the service role (used by the wallet server function) can reach these tables and functions.
- Functions run with the caller's rights (not elevated), and execute permission is removed from public roles.

4. Important Notes
- Balances can only change through the wallet server function. There are no credit paths exposed to browsers.
- Balance columns are integers so no rounding drift occurs.
*/

CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_coins bigint NOT NULL DEFAULT 0 CHECK (hub_coins >= 0),
  earned_cash_kes bigint NOT NULL DEFAULT 0 CHECK (earned_cash_kes >= 0),
  hmac_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  bucket text NOT NULL CHECK (bucket IN ('hub_coins', 'earned_cash')),
  amount bigint NOT NULL CHECK (amount <> 0),
  balance_after bigint NOT NULL CHECK (balance_after >= 0),
  kind text NOT NULL,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_ledger_wallet_created_idx ON wallet_ledger (wallet_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wallet_nonces (
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  nonce text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wallet_id, nonce)
);

CREATE TABLE IF NOT EXISTS payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount_kes bigint NOT NULL CHECK (amount_kes >= 500),
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payout_requests_wallet_idx ON payout_requests (wallet_id, created_at DESC);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON wallets, wallet_ledger, wallet_nonces, payout_requests FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON wallets, wallet_ledger, wallet_nonces, payout_requests TO service_role;

CREATE OR REPLACE FUNCTION apply_wallet_entry(
  p_wallet uuid,
  p_bucket text,
  p_amount bigint,
  p_kind text,
  p_reference text
)
RETURNS bigint
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_balance bigint;
BEGIN
  IF p_amount = 0 THEN
    RAISE EXCEPTION 'amount_zero';
  END IF;

  IF p_bucket = 'hub_coins' THEN
    UPDATE wallets
      SET hub_coins = hub_coins + p_amount
      WHERE id = p_wallet AND hub_coins + p_amount >= 0
      RETURNING hub_coins INTO v_balance;
  ELSIF p_bucket = 'earned_cash' THEN
    UPDATE wallets
      SET earned_cash_kes = earned_cash_kes + p_amount
      WHERE id = p_wallet AND earned_cash_kes + p_amount >= 0
      RETURNING earned_cash_kes INTO v_balance;
  ELSE
    RAISE EXCEPTION 'invalid_bucket';
  END IF;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient_funds';
  END IF;

  INSERT INTO wallet_ledger (wallet_id, bucket, amount, balance_after, kind, reference)
  VALUES (p_wallet, p_bucket, p_amount, v_balance, p_kind, p_reference);

  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION request_wallet_payout(
  p_wallet uuid,
  p_amount_kes bigint,
  p_phone text,
  p_reference text
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_amount_kes < 500 THEN
    RAISE EXCEPTION 'below_minimum_payout';
  END IF;

  PERFORM apply_wallet_entry(p_wallet, 'earned_cash', -p_amount_kes, 'payout', p_reference);

  INSERT INTO payout_requests (wallet_id, amount_kes, phone, reference)
  VALUES (p_wallet, p_amount_kes, p_phone, p_reference)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION apply_wallet_entry(uuid, text, bigint, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION request_wallet_payout(uuid, bigint, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION apply_wallet_entry(uuid, text, bigint, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION request_wallet_payout(uuid, bigint, text, text) TO service_role;
