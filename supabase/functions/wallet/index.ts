import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Wallet-Id, X-Wallet-Ts, X-Wallet-Nonce, X-Wallet-Signature',
};

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const NONCE_RETENTION_MS = 10 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NONCE_RE = /^[A-Za-z0-9_-]{16,64}$/;
const PHONE_RE = /^(\+?254|0)[17]\d{8}$/;
const PURPOSES = ['tip', 'tournament_entry'] as const;
const CREDIT_KINDS = ['sale', 'reward', 'referral_bonus'] as const;
const DARAJA_CONSUMER_KEY = Deno.env.get('DARAJA_CONSUMER_KEY') ?? '';
const DARAJA_CONSUMER_SECRET = Deno.env.get('DARAJA_CONSUMER_SECRET') ?? '';
const DARAJA_SHORTCODE = Deno.env.get('DARAJA_B2C_SHORTCODE') ?? '';
const DARAJA_INITIATOR = Deno.env.get('DARAJA_B2C_INITIATOR') ?? '';
const DARAJA_SECURITY_CREDENTIAL = Deno.env.get('DARAJA_B2C_SECURITY_CREDENTIAL') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const DARAJA_AUTH_URL = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
const DARAJA_B2C_URL = 'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest';

const DARAJA_CONFIGURED =
  DARAJA_CONSUMER_KEY &&
  DARAJA_CONSUMER_SECRET &&
  DARAJA_SHORTCODE &&
  DARAJA_INITIATOR &&
  DARAJA_SECURITY_CREDENTIAL;

let darajaToken: { token: string; expiresAt: number } | null = null;

async function getDarajaToken(): Promise<string> {
  if (darajaToken && Date.now() < darajaToken.expiresAt) return darajaToken.token;
  const credentials = btoa(`${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`);
  const res = await fetch(DARAJA_AUTH_URL, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) throw new Error('daraja_auth_failed');
  const data = await res.json();
  if (!data.access_token) throw new Error('daraja_auth_failed');
  darajaToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 - 60000 };
  return darajaToken.token;
}

async function darajaResultToken(): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SERVICE_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('daraja-result-callback'));
  return toHex(signature);
}

async function sendB2cPayout(phone: string, amountKes: number, reference: string): Promise<void> {
  const token = await getDarajaToken();
  const normalizedPhone = phone.startsWith('+') ? phone.slice(1) : phone.startsWith('0') ? `254${phone.slice(1)}` : phone;
  const callbackUrl = `${SUPABASE_URL}/functions/v1/payout-result?token=${await darajaResultToken()}`;
  const payload = {
    InitiatorName: DARAJA_INITIATOR,
    SecurityCredential: DARAJA_SECURITY_CREDENTIAL,
    CommandID: 'BusinessPayment',
    Amount: amountKes,
    PartyA: DARAJA_SHORTCODE,
    PartyB: normalizedPhone,
    Remarks: 'SmartHub payout',
    Occasion: reference,
    OriginatorConversationID: reference,
    ResultURL: callbackUrl,
    QueueTimeOutURL: callbackUrl,
  };
  const res = await fetch(DARAJA_B2C_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (data.ResponseCode !== '0') {
    throw new Error(data.ResponseDescription ?? 'daraja_b2c_failed');
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomHex(bytes: number): string {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return toHex(signature);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isPositiveInt(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      return json(500, { error: 'Server not configured.' });
    }
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const rawBody = await req.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json(400, { error: 'Invalid JSON body' });
    }
    const action = body.action;

    if (action === 'create') {
      const hmacKey = randomHex(32);
      const { data, error } = await supabase
        .from('wallets')
        .insert({ hmac_key: hmacKey })
        .select('id')
        .single();
      if (error || !data) return json(500, { error: 'Could not create your wallet.' });
      return json(200, { walletId: data.id, hmacKey });
    }

    const walletId = req.headers.get('x-wallet-id') ?? '';
    const timestamp = req.headers.get('x-wallet-ts') ?? '';
    const nonce = req.headers.get('x-wallet-nonce') ?? '';
    const signature = req.headers.get('x-wallet-signature') ?? '';
    if (!UUID_RE.test(walletId) || !NONCE_RE.test(nonce) || !/^[0-9a-f]{64}$/.test(signature)) {
      return json(401, { error: 'Request could not be verified.' });
    }

    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_CLOCK_SKEW_MS) {
      return json(401, { error: 'Request expired. Please try again.' });
    }

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('hmac_key')
      .eq('id', walletId)
      .maybeSingle();
    if (walletError) return json(500, { error: 'Could not load your wallet.' });
    if (!wallet) return json(401, { error: 'Request could not be verified.' });

    const expected = await hmacSha256Hex(wallet.hmac_key, `${timestamp}.${nonce}.${rawBody}`);
    if (!constantTimeEqual(expected, signature)) {
      return json(401, { error: 'Request could not be verified.' });
    }

    await supabase
      .from('wallet_nonces')
      .delete()
      .eq('wallet_id', walletId)
      .lt('created_at', new Date(Date.now() - NONCE_RETENTION_MS).toISOString());
    const { error: nonceError } = await supabase
      .from('wallet_nonces')
      .insert({ wallet_id: walletId, nonce });
    if (nonceError) {
      return json(401, { error: 'Request was already used. Please try again.' });
    }

    if (action === 'state') {
      const [balances, ledger, payouts] = await Promise.all([
        supabase.from('wallets').select('hub_coins, earned_cash_kes').eq('id', walletId).single(),
        supabase
          .from('wallet_ledger')
          .select('id, bucket, amount, balance_after, kind, reference, created_at')
          .eq('wallet_id', walletId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('payout_requests')
          .select('id, amount_kes, phone, status, reference, receipt_code, created_at')
          .eq('wallet_id', walletId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      if (balances.error || ledger.error || payouts.error) {
        return json(500, { error: 'Could not load your wallet.' });
      }
      return json(200, {
        hubCoins: balances.data.hub_coins,
        earnedCashKes: balances.data.earned_cash_kes,
        ledger: ledger.data,
        payouts: payouts.data,
      });
    }

    if (action === 'spend_hub_coins') {
      const amount = body.amount;
      const purpose = body.purpose;
      if (!isPositiveInt(amount, 100000)) return json(422, { error: 'Enter a valid coin amount.' });
      if (!PURPOSES.includes(purpose as (typeof PURPOSES)[number])) {
        return json(422, { error: 'Unknown coin purpose.' });
      }
      const { data, error } = await supabase.rpc('apply_wallet_entry', {
        p_wallet: walletId,
        p_bucket: 'hub_coins',
        p_amount: -amount,
        p_kind: purpose,
        p_reference: null,
      });
      if (error) {
        if (error.message.includes('insufficient_funds')) return json(409, { error: 'Not enough Hub Coins.' });
        return json(500, { error: 'Could not complete this action.' });
      }
      return json(200, { ok: true, hubCoins: data });
    }

    if (action === 'request_payout') {
      const amountKes = body.amountKes;
      const phone = typeof body.phone === 'string' ? body.phone.replace(/\s+/g, '') : '';
      if (!isPositiveInt(amountKes, 1000000)) return json(422, { error: 'Enter a valid amount.' });
      if (amountKes < 500) return json(422, { error: 'Minimum withdrawal is KES 500.' });
      if (!PHONE_RE.test(phone)) return json(422, { error: 'Enter a valid M-Pesa phone number.' });
      const reference = `SH${Date.now().toString(36).toUpperCase()}${randomHex(3).toUpperCase()}`;
      const { data, error } = await supabase.rpc('request_wallet_payout', {
        p_wallet: walletId,
        p_amount_kes: amountKes,
        p_phone: phone,
        p_reference: reference,
      });
      if (error) {
        if (error.message.includes('insufficient_funds')) return json(409, { error: 'Not enough Earned Cash.' });
        if (error.message.includes('below_minimum_payout')) return json(422, { error: 'Minimum withdrawal is KES 500.' });
        return json(500, { error: 'Could not start this withdrawal.' });
      }

      // Attempt real Daraja B2C transfer only if ALL credentials are configured
      if (DARAJA_CONFIGURED) {
        try {
          await sendB2cPayout(phone, amountKes, reference);
          await supabase
            .from('payout_requests')
            .update({ status: 'success' })
            .eq('id', data);
          return json(200, { ok: true, payoutId: data, reference, status: 'success' });
        } catch {
          // B2C failed — refund the earned cash and mark payout as failed
          await supabase.rpc('apply_wallet_entry', {
            p_wallet: walletId,
            p_bucket: 'earned_cash',
            p_amount: amountKes,
            p_kind: 'payout_refund',
            p_reference: reference,
          });
          await supabase
            .from('payout_requests')
            .update({ status: 'failed' })
            .eq('id', data);
          return json(200, { ok: true, payoutId: data, reference, status: 'failed' });
        }
      }

      // Simulation mode — no Daraja credentials configured, payout stays pending
      return json(200, { ok: true, payoutId: data, reference, status: 'pending', simulation: true });
    }

    if (action === 'credit_earnings') {
      const amountKes = body.amountKes;
      const kind = body.kind;
      const reference = typeof body.reference === 'string' && body.reference.trim() ? body.reference.trim() : null;
      if (!isPositiveInt(amountKes, 100000000)) return json(422, { error: 'Enter a valid amount.' });
      if (!CREDIT_KINDS.includes(kind as (typeof CREDIT_KINDS)[number])) {
        return json(422, { error: 'Unknown earning type.' });
      }
      const { data, error } = await supabase.rpc('apply_wallet_entry', {
        p_wallet: walletId,
        p_bucket: 'earned_cash',
        p_amount: amountKes,
        p_kind: kind,
        p_reference: reference,
      });
      if (error) return json(500, { error: 'Could not credit your earnings.' });
      return json(200, { ok: true, earnedCashKes: data });
    }

    if (action === 'topup') {
      const amount = body.amount;
      const gateway = body.gateway;
      const reference = typeof body.reference === 'string' && body.reference.trim() ? body.reference.trim() : null;
      if (!isPositiveInt(amount, 1000000)) return json(422, { error: 'Enter a valid amount.' });
      if (gateway !== 'paystack' && gateway !== 'pesapal' && gateway !== 'mpesa_stk') {
        return json(422, { error: 'Unknown payment method.' });
      }
      const { data, error } = await supabase.rpc('apply_wallet_entry', {
        p_wallet: walletId,
        p_bucket: 'hub_coins',
        p_amount: amount,
        p_kind: 'topup',
        p_reference: reference ?? `${gateway}_${Date.now().toString(36)}`,
      });
      if (error) return json(500, { error: 'Could not credit your wallet.' });
      return json(200, { ok: true, hubCoins: data });
    }

    if (action === 'schedule_payout') {
      const amountKes = body.amountKes;
      const phone = typeof body.phone === 'string' ? body.phone.replace(/\s+/g, '') : '';
      const scheduledFor = typeof body.scheduledFor === 'string' ? body.scheduledFor : null;
      if (!isPositiveInt(amountKes, 1000000)) return json(422, { error: 'Enter a valid amount.' });
      if (amountKes < 500) return json(422, { error: 'Minimum withdrawal is KES 500.' });
      if (!PHONE_RE.test(phone)) return json(422, { error: 'Enter a valid M-Pesa phone number.' });
      const reference = `SH${Date.now().toString(36).toUpperCase()}${randomHex(3).toUpperCase()}`;
      const { data, error } = await supabase.rpc('request_wallet_payout', {
        p_wallet: walletId,
        p_amount_kes: amountKes,
        p_phone: phone,
        p_reference: reference,
      });
      if (error) {
        if (error.message.includes('insufficient_funds')) return json(409, { error: 'Not enough Earned Cash.' });
        if (error.message.includes('below_minimum_payout')) return json(422, { error: 'Minimum withdrawal is KES 500.' });
        return json(500, { error: 'Could not schedule this withdrawal.' });
      }
      if (scheduledFor) {
        await supabase
          .from('payout_requests')
          .update({ scheduled_for: scheduledFor })
          .eq('id', data);
      }
      return json(200, { ok: true, payoutId: data, reference, status: 'pending', scheduledFor });
    }

    if (action === 'check_payout_status') {
      const payoutId = typeof body.payoutId === 'string' ? body.payoutId : '';
      if (!UUID_RE.test(payoutId)) return json(422, { error: 'Invalid payout reference.' });
      const { data: payout, error: payoutError } = await supabase
        .from('payout_requests')
        .select('status, reference')
        .eq('id', payoutId)
        .eq('wallet_id', walletId)
        .maybeSingle();
      if (payoutError || !payout) return json(404, { error: 'Payout not found.' });
      return json(200, { ok: true, status: payout.status, reference: payout.reference });
    }

    return json(400, { error: 'Unknown action.' });
  } catch {
    return json(500, { error: 'Unexpected server error.' });
  }
});
