/*
# Add scheduled_for column to payout_requests

1. Modified Tables
- `payout_requests`: adds a nullable `scheduled_for` timestamptz column. When set, the payout is queued for the weekly batch disbursement. When null, the payout is processed immediately (existing behavior).

2. Notes
- No data is lost; existing rows get NULL for the new column, which means "process immediately."
- The KES 500 minimum check in request_wallet_payout still applies.
*/

ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

CREATE INDEX IF NOT EXISTS payout_requests_scheduled_idx
  ON payout_requests (scheduled_for)
  WHERE scheduled_for IS NOT NULL AND status = 'pending';
