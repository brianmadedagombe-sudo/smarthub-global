import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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

    const expectedToken = Array.from(
      new Uint8Array(
        await crypto.subtle.sign(
          'HMAC',
          await crypto.subtle.importKey('raw', new TextEncoder().encode(serviceKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
          new TextEncoder().encode('daraja-result-callback'),
        ),
      ),
    )
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const providedToken = new URL(req.url).searchParams.get('token') ?? '';
    if (!constantTimeEqual(providedToken, expectedToken)) {
      return json(401, { error: 'Unauthorized' });
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return json(400, { error: 'Invalid JSON body' });
    }

    const result = (payload as { Result?: Record<string, unknown> })?.Result;
    const reference = typeof result?.OriginatorConversationID === 'string' ? result.OriginatorConversationID : '';
    const params = (result?.ResultParameters as { ResultParameter?: { Key?: unknown; Value?: unknown }[] } | undefined)?.ResultParameter;
    const receipt = Array.isArray(params)
      ? params.find((p) => p?.Key === 'TransactionReceipt')?.Value
      : undefined;

    if (result?.ResultCode === 0 && reference && typeof receipt === 'string' && receipt.trim()) {
      const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const { error } = await supabase
        .from('payout_requests')
        .update({ receipt_code: receipt.trim() })
        .eq('reference', reference)
        .is('receipt_code', null);
      if (error) return json(500, { error: 'Could not save receipt.' });
    }

    return json(200, { ResultCode: 0, ResultDesc: 'Accepted' });
  } catch {
    return json(500, { error: 'Unexpected server error.' });
  }
});
