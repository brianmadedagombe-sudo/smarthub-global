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
const CONTACT_RE = /^\+?\d{8,15}$/;
const MAX_TEXT = 80;

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

function cleanText(value: unknown, max = MAX_TEXT): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
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
    if (walletError) return json(500, { error: 'Could not load your registrations.' });
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

    const action = body.action;

    if (action === 'list') {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select('id, tournament_ref, game, ign, player_id, squad_id, contact, created_at')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return json(500, { error: 'Could not load your registrations.' });
      return json(200, { registrations: data ?? [] });
    }

    if (action === 'register') {
      const game = cleanText(body.game);
      const ign = cleanText(body.ign);
      const playerId = cleanText(body.playerId);
      const squadId = cleanText(body.squadId);
      const contact = cleanText(body.contact, 16);
      const tournamentRef = cleanText(body.tournamentRef, 64) || null;

      if (!game) return json(400, { error: 'Select a game first.' });
      if (!ign) return json(400, { error: 'Enter your in-game name (IGN).' });
      if (!tournamentRef) {
        if (!playerId && !squadId) return json(400, { error: 'Enter your Player ID or Squad ID.' });
        if (!CONTACT_RE.test(contact)) return json(400, { error: 'Enter a valid contact number (8-15 digits).' });
      }

      const { data, error } = await supabase
        .from('tournament_registrations')
        .insert({
          wallet_id: walletId,
          tournament_ref: tournamentRef,
          game,
          ign,
          player_id: playerId,
          squad_id: squadId,
          contact,
        })
        .select('id, tournament_ref, game, ign, player_id, squad_id, contact, created_at')
        .single();
      if (error) {
        if (error.code === '23505') {
          return json(409, { error: 'You are already registered for this tournament.' });
        }
        return json(500, { error: 'Could not save your registration.' });
      }
      return json(200, { registration: data });
    }

    if (action === 'remove') {
      const registrationId = typeof body.id === 'string' ? body.id : '';
      if (!UUID_RE.test(registrationId)) return json(400, { error: 'Invalid registration.' });
      const { error } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('id', registrationId)
        .eq('wallet_id', walletId);
      if (error) return json(500, { error: 'Could not remove your registration.' });
      return json(200, { ok: true });
    }

    return json(400, { error: 'Unknown action' });
  } catch {
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
});
