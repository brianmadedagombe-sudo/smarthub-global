// Edge function: proxies Gemini AI generation requests server-side so the
// API key never reaches the browser. The key is stored in the `app_secrets`
// table and fetched at runtime using the service role key.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_PROMPT = 4000;

// Cache the key for the lifetime of the instance to avoid a DB lookup per request.
let cachedKey: string | null | undefined = undefined;

async function getGeminiKey(): Promise<string | null> {
  if (cachedKey !== undefined) return cachedKey;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (supabaseUrl && serviceRoleKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/app_secrets?name=eq.GEMINI_API_KEY&select=value&limit=1`, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: "application/json",
        },
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0 && typeof rows[0].value === "string") {
          cachedKey = rows[0].value;
          return cachedKey;
        }
      }
    } catch {
      // Fall through — cachedKey stays null.
    }
  }

  cachedKey = null;
  return cachedKey;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const apiKey = await getGeminiKey();
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.slice(0, MAX_PROMPT) : "";
    const system = typeof body?.system === "string" ? body.system.slice(0, 2000) : "";

    if (!prompt.trim()) {
      return new Response(
        JSON.stringify({ error: "Empty prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Minimal control-char strip — matches the client-side sanitize().
    // eslint-disable-next-line no-control-regex
    const cleanPrompt = prompt.replace(/[\u0000-\u001F\u007F]/g, "").trim();
    // eslint-disable-next-line no-control-regex
    const cleanSystem = system.replace(/[\u0000-\u001F\u007F]/g, "").trim();

    const { GoogleGenAI } = await import("npm:@google/genai@2.31.0");
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `${cleanSystem}\n\n${cleanPrompt}`,
    });
    const text = res.text?.();
    if (text && text.trim()) {
      return new Response(
        JSON.stringify({ text: text.trim() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ error: "Empty AI response" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
