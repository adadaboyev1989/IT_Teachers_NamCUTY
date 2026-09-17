// Called by the admin panel right after creating a task, to announce it to
// every registered teacher via the bot. Protected purely by Supabase's own
// JWT verification (see supabase/config.toml: verify_jwt = true for this
// function) — only a request carrying a valid Supabase Auth session (i.e.
// someone logged into the admin panel) reaches this code at all, so there's
// no separate secret for the browser to embed.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => null);
  const title = body?.title;
  const points = body?.points;
  if (typeof title !== "string" || !title.trim() || typeof points !== "number") {
    return new Response(JSON.stringify({ error: "title (string) and points (number) required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/telegram-bot?notifyTask=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ title, points }),
  });
  const result = await resp.json().catch(() => ({}));

  return new Response(JSON.stringify(result), {
    status: resp.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
