/*
# Add M-Pesa receipt code to payout requests

1. Modified Tables
- `payout_requests`: adds a nullable `receipt_code` text column that stores the M-Pesa transaction receipt (e.g. "QGH7XXXX") once Safaricom confirms the payout.

2. Security
- No change to row level security or grants. The column is only read and written by server-side functions using the service role.

3. Important Notes
- Existing rows keep a NULL receipt code until a confirmation arrives.
- The column is additive, so no data is lost or changed.
*/

ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS receipt_code text;
