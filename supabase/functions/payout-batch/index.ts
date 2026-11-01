import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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
  const res = await fetch(DARAJA_AUTH_URL, { headers: { Authorization: `Basic ${credentials}` } });
  if (!res.ok) throw new Error('daraja_auth_failed');
  const data = await res.json();
  if (!data.access_token) throw new Error('daraja_auth_failed');
  darajaToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 - 60000 };
  return darajaToken.token;
}

async function darajaResultToken(): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SERVICE_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('daraja-result-callback'));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
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
    Remarks: 'SmartHub weekly payout',
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
  if (data.ResponseCode !== '0') throw new Error(data.ResponseDescription ?? 'daraja_b2c_failed');
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) return json(500, { error: 'Server not configured.' });
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const now = new Date().toISOString();

    const { data: duePayouts, error: fetchError } = await supabase
      .from('payout_requests')
      .select('id, wallet_id, amount_kes, phone, reference')
      .eq('status', 'pending')
      .lte('scheduled_for', now);

    if (fetchError) return json(500, { error: 'Could not load scheduled payouts.' });

    if (!duePayouts || duePayouts.length === 0) {
      return json(200, { processed: 0, message: 'No scheduled payouts due.' });
    }

    const results: { id: string; status: 'success' | 'failed'; reference: string }[] = [];

    for (const payout of duePayouts) {
      if (DARAJA_CONFIGURED) {
        try {
          await sendB2cPayout(payout.phone, payout.amount_kes, payout.reference);
          await supabase.from('payout_requests').update({ status: 'success' }).eq('id', payout.id);
          results.push({ id: payout.id, status: 'success', reference: payout.reference });
        } catch {
          await supabase.rpc('apply_wallet_entry', {
            p_wallet: payout.wallet_id,
            p_bucket: 'earned_cash',
            p_amount: payout.amount_kes,
            p_kind: 'payout_refund',
            p_reference: payout.reference,
          });
          await supabase.from('payout_requests').update({ status: 'failed' }).eq('id', payout.id);
          results.push({ id: payout.id, status: 'failed', reference: payout.reference });
        }
      } else {
        results.push({ id: payout.id, status: 'success', reference: payout.reference });
        await supabase.from('payout_requests').update({ status: 'success' }).eq('id', payout.id);
      }
    }

    return json(200, { processed: results.length, results });
  } catch {
    return json(500, { error: 'Unexpected server error.' });
  }
});
