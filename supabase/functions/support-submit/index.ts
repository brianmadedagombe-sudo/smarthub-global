import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SupportPayload {
  name?: string;
  replyTo?: string;
  subject?: string;
  message?: string;
}

function bad(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return bad(405, 'Method not allowed');
  }

  try {
    const body = (await req.json().catch(() => null)) as SupportPayload | null;
    if (!body) return bad(400, 'Invalid JSON body');

    const name = String(body.name ?? '').trim().slice(0, 80);
    const replyTo = String(body.replyTo ?? '').trim().slice(0, 120);
    const subject = String(body.subject ?? '').trim().slice(0, 120);
    const message = String(body.message ?? '').trim().slice(0, 2000);

    if (!subject || !message) {
      return bad(422, 'Subject and message are required.');
    }
    if (replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) {
      return bad(422, 'Reply-to email is invalid.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      return bad(500, 'Server not configured.');
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { error } = await supabase.from('support_tickets').insert({
      name: name || 'Anonymous',
      reply_to: replyTo || null,
      subject,
      message,
      status: 'open',
    });

    if (error) {
      return bad(500, 'Could not save your message.');
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error';
    return bad(500, msg);
  }
});
