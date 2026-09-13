import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";

// bot_users and pedagog_data are locked down to service-role access only
// (see 20260905160000_lock_down_rls_policies.sql), so this trusted
// server-side function must use the service-role key, not anon.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- Telegram WebApp initData verification ---
// The old version trusted a bare `telegram_id` query param straight from the
// client, so anyone (no Telegram app needed) could fetch any pedagog's FIO,
// PINFL, birth date and school just by guessing/incrementing an id — a
// straightforward IDOR leak of sensitive personal data. Telegram Mini Apps
// sign the data handed to the page (`tg.initData`) with an HMAC keyed off the
// bot token; verifying that signature server-side is the only way to know
// the request truly comes from that Telegram user. See:
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
async function hmacSha256(keyBytes: Uint8Array, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60;

async function verifyTelegramInitData(
  initData: string,
): Promise<{ id: number; first_name?: string; username?: string } | null> {
  if (!initData || !BOT_TOKEN) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = await hmacSha256(new TextEncoder().encode("WebAppData"), BOT_TOKEN);
  const computedHash = bytesToHex(await hmacSha256(secretKey, dataCheckString));

  if (computedHash !== hash) return null;

  const authDate = parseInt(params.get("auth_date") || "0", 10);
  const now = Math.floor(Date.now() / 1000);
  if (!authDate || now - authDate > MAX_INIT_DATA_AGE_SECONDS) return null;

  const userJson = params.get("user");
  if (!userJson) return null;

  try {
    const user = JSON.parse(userJson);
    if (!user?.id) return null;
    return user;
  } catch {
    return null;
  }
}

const STORAGE_BUCKET = "miniapp";
const STORAGE_PATH = "index.html";
const STORAGE_PUBLIC_URL = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${STORAGE_PATH}`;

// NOTE: public/miniapp.html (served from the site's own hosting) is a
// near-identical copy of this generated page — there's no shared build step
// between the Vite frontend and these Deno edge functions to de-duplicate
// them across runtimes, so any change to the markup/JS below (especially the
// initData auth flow) must be mirrored there too.
function buildMiniAppHtml(): string {
  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>IT O'qituvchilar Namangan</title>
  <script src="https://telegram.org/js/telegram-web-app.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --primary: #2563eb;
      --primary-dark: #1e40af;
      --primary-light: #dbeafe;
      --success: #059669;
      --warning: #d97706;
      --error: #dc2626;
      --neutral-50: #f9fafb;
      --neutral-100: #f3f4f6;
      --neutral-200: #e5e7eb;
      --neutral-300: #d1d5db;
      --neutral-500: #6b7280;
      --neutral-700: #374151;
      --neutral-900: #111827;
      --bg: var(--tg-theme-bg-color, #f9fafb);
      --text: var(--tg-theme-text-color, #111827);
      --hint: var(--tg-theme-hint-color, #6b7280);
      --link: var(--tg-theme-link-color, #2563eb);
      --button: var(--tg-theme-button-color, #2563eb);
      --button-text: var(--tg-theme-button-text-color, #ffffff);
      --secondary-bg: var(--tg-theme-secondary-bg-color, #ffffff);
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 16px;
    }
    .header { text-align: center; padding: 24px 0 20px; }
    .header-icon {
      width: 64px; height: 64px; margin: 0 auto 12px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 32px;
    }
    .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .header p { font-size: 14px; color: var(--hint); }
    .card {
      background: var(--secondary-bg); border-radius: 16px; padding: 20px; margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .card-title {
      font-size: 13px; font-weight: 600; color: var(--hint);
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;
    }
    .info-row {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 10px 0; border-bottom: 1px solid var(--neutral-200);
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-size: 14px; color: var(--hint); flex-shrink: 0; }
    .info-value { font-size: 14px; font-weight: 500; text-align: right; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-oliy { background: #d1fae5; color: #065f46; }
    .badge-birinchi { background: var(--primary-light); color: var(--primary-dark); }
    .badge-ikkinchi { background: #fef3c7; color: #92400e; }
    .badge-mutaxassis { background: #cffafe; color: #155e75; }
    .rating-card { text-align: center; padding: 28px 20px; }
    .rating-number { font-size: 48px; font-weight: 800; color: var(--primary); line-height: 1; }
    .rating-label { font-size: 14px; color: var(--hint); margin-top: 8px; }
    .rating-stars { margin-top: 12px; font-size: 20px; }
    .loading { display: flex; justify-content: center; align-items: center; min-height: 60vh; }
    .spinner {
      width: 40px; height: 40px; border: 3px solid var(--neutral-200);
      border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error { text-align: center; padding: 40px 20px; color: var(--error); }
    .error-icon { font-size: 48px; margin-bottom: 12px; }
    .btn {
      display: block; width: 100%; padding: 14px; border: none; border-radius: 12px;
      font-size: 15px; font-weight: 600; cursor: pointer; text-align: center; text-decoration: none;
    }
    .btn-primary { background: var(--button); color: var(--button-text); }
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
    .stat-box { background: var(--neutral-50); border-radius: 12px; padding: 14px; text-align: center; }
    .stat-value { font-size: 20px; font-weight: 700; color: var(--primary); }
    .stat-label { font-size: 11px; color: var(--hint); margin-top: 2px; }
    .cert-item { padding: 12px; background: var(--neutral-50); border-radius: 12px; margin-top: 8px; }
    .cert-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .cert-date { font-size: 12px; color: var(--hint); }
    .section-gap { height: 8px; }
  </style>
</head>
<body>
  <div id="app">
    <div class="loading"><div class="spinner"><\/div><\/div>
  </div>
  <script>
    var API_BASE = "${SUPABASE_URL}/functions/v1/miniapp-data";
    var tg = window.Telegram && window.Telegram.WebApp;
    if (tg) { tg.ready(); tg.expand(); }

    function escapeHtml(str) {
      if (!str) return '\\u2014';
      return String(str).replace(/[&<>"']/g, function(m) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
      });
    }

    function formatDate(dateStr) {
      if (!dateStr) return '\\u2014';
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return '\\u2014';
      return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }

    function categoryBadge(cat) {
      var map = {'Oliy':'badge-oliy','Birinchi':'badge-birinchi','Ikkinchi':'badge-ikkinchi','Mutaxassis':'badge-mutaxassis'};
      return '<span class="badge ' + (map[cat] || 'badge-mutaxassis') + '">' + escapeHtml(cat) + '</span>';
    }

    function calcRating(p) {
      var score = 0;
      var catScores = {'Oliy':40,'Birinchi':30,'Ikkinchi':20,'Mutaxassis':15};
      score += catScores[p.category] || 15;
      score += Math.min(p.lesson_hours || 0, 30);
      if (p.certificate_name) score += 15;
      if (p.certificate_expiry_date) {
        var exp = new Date(p.certificate_expiry_date);
        if (exp > new Date()) score += 15;
      }
      return Math.min(score, 100);
    }

    function stars(score) {
      var full = Math.floor(score / 20);
      var s = '';
      for (var i = 0; i < 5; i++) s += i < full ? '\\u2B50' : '\\u2606';
      return s;
    }

    function showError(icon, message) {
      document.getElementById('app').innerHTML =
        '<div class="error"><div class="error-icon">' + icon + '</div>' +
        '<p>' + escapeHtml(message) + '</p>' +
        '<div style="margin-top:20px"><a class="btn btn-primary" href="https://t.me/it_teachers_namcity_bot">Botga qaytish</a></div></div>';
    }

    async function loadData() {
      // We send the raw signed tg.initData string (not initDataUnsafe.user.id)
      // so the server can verify it really came from Telegram via HMAC —
      // trusting a bare id here would let anyone fetch anyone else's PINFL.
      var initData = tg && tg.initData;
      if (!initData) {
        showError('\\u26A0\\uFE0F', 'Telegram ma\\u2019lumotlari topilmadi. Iltimos, bot orqali kiring.');
        return;
      }

      try {
        var resp = await fetch(API_BASE + '/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Client-Info': 'miniapp' },
          body: JSON.stringify({ initData: initData })
        });
        var data = await resp.json();

        if (!data.ok) {
          showError('\\u26A0\\uFE0F', data.error || 'Ma\\u2019lumot topilmadi');
          return;
        }

        var p = data.pedagog;
        if (!p) {
          showError('\\uD83D\\uDCCB', 'Sizning pedagog ma\\u2019lumotlaringiz topilmadi. Iltimos, adminga murojaat qiling.');
          return;
        }

        var rating = calcRating(p);
        var html = '<div class="header"><div class="header-icon">\\uD83C\\uDF93</div><h1>IT O\\u2019qituvchilar</h1><p>Namangan shahar</p></div>';
        html += '<div class="card rating-card"><div class="rating-number">' + rating + '</div><div class="rating-label">Sizning reyting balingiz</div><div class="rating-stars">' + stars(rating) + '</div></div>';
        html += '<div class="card"><div class="card-title">\\uD83D\\uDCCB Shaxsiy ma\\u2019lumotlar</div>';
        html += '<div class="info-row"><span class="info-label">FIO</span><span class="info-value">' + escapeHtml(p.full_name) + '</span></div>';
        html += '<div class="info-row"><span class="info-label">Maktab</span><span class="info-value">' + escapeHtml(p.school) + '</span></div>';
        html += '<div class="info-row"><span class="info-label">PINFL</span><span class="info-value">' + escapeHtml(p.pinfl) + '</span></div>';
        html += '<div class="info-row"><span class="info-label">Tug\\u2019ilgan sana</span><span class="info-value">' + formatDate(p.birth_date) + '</span></div>';
        html += '<div class="info-row"><span class="info-label">Toifa</span>' + categoryBadge(p.category) + '</div>';
        html += '<div class="info-row"><span class="info-label">Dars soati</span><span class="info-value">' + (p.lesson_hours || 0) + ' soat</span></div>';
        html += '</div>';

        if (p.certificate_name) {
          html += '<div class="card"><div class="card-title">\\uD83C\\uDF93 Sertifikat</div><div class="cert-item"><div class="cert-name">' + escapeHtml(p.certificate_name) + '</div>';
          html += '<div class="cert-date">\\uD83D\\uDCC5 Olingan: ' + formatDate(p.certificate_issue_date) + '</div>';
          html += '<div class="cert-date">\\uD83D\\uDCC5 Tugaydi: ' + formatDate(p.certificate_expiry_date) + '</div></div></div>';
        }

        html += '<div class="card"><div class="card-title">\\uD83D\\uDCCA Reyting tafsilotlari</div><div class="stat-grid">';
        var catScores = {'Oliy':40,'Birinchi':30,'Ikkinchi':20,'Mutaxassis':15};
        html += '<div class="stat-box"><div class="stat-value">' + (catScores[p.category] || 15) + '</div><div class="stat-label">Toifa bali</div></div>';
        html += '<div class="stat-box"><div class="stat-value">' + Math.min(p.lesson_hours || 0, 30) + '</div><div class="stat-label">Dars soati bali</div></div>';
        html += '<div class="stat-box"><div class="stat-value">' + (p.certificate_name ? 15 : 0) + '</div><div class="stat-label">Sertifikat bali</div></div>';
        html += '<div class="stat-box"><div class="stat-value">' + (p.certificate_expiry_date && new Date(p.certificate_expiry_date) > new Date() ? 15 : 0) + '</div><div class="stat-label">Amal qilish bali</div></div>';
        html += '</div></div><div class="section-gap"></div>';

        document.getElementById('app').innerHTML = html;
      } catch (err) {
        showError('\\u26A0\\uFE0F', 'Ma\\u2019lumot yuklashda xatolik: ' + err.message);
      }
    }

    loadData();
  <\/script>
</body>
</html>`;
}

async function uploadHtmlToStorage(): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (!SUPABASE_SERVICE_KEY) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY not available" };
  }

  const html = buildMiniAppHtml();

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(STORAGE_PATH, html, {
      contentType: "text/html; charset=utf-8",
      upsert: true,
    });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, url: STORAGE_PUBLIC_URL };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/$/, "");

  if (url.searchParams.get("debug") === "true") {
    return new Response(JSON.stringify({ path, fullUrl: req.url, method: req.method }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (url.searchParams.get("uploadHtml") === "true") {
    const result = await uploadHtmlToStorage();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (url.searchParams.get("getStorageUrl") === "true") {
    return new Response(JSON.stringify({ ok: true, url: STORAGE_PUBLIC_URL }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (path === "/miniapp-data/api/user") {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "POST required" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const initData = body?.initData;
    const verifiedUser = await verifyTelegramInitData(initData);

    if (!verifiedUser) {
      return new Response(JSON.stringify({ ok: false, error: "Telegram autentifikatsiyasi muvaffaqiyatsiz tugadi" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: user } = await supabase
      .from("bot_users")
      .select("*")
      .eq("telegram_id", verifiedUser.id)
      .maybeSingle();

    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "Foydalanuvchi topilmadi" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let pedagog = null;
    if (user.pedagog_data_id) {
      const { data: ped } = await supabase
        .from("pedagog_data")
        .select("*")
        .eq("id", user.pedagog_data_id)
        .maybeSingle();
      pedagog = ped;
    } else if (user.pinfl) {
      const { data: ped } = await supabase
        .from("pedagog_data")
        .select("*")
        .eq("pinfl", user.pinfl)
        .maybeSingle();
      pedagog = ped;
    }

    return new Response(JSON.stringify({ ok: true, user, pedagog }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (path === "/miniapp-data" || path === "/miniapp-data/") {
    const html = buildMiniAppHtml();
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return new Response(JSON.stringify({ ok: true, storageUrl: STORAGE_PUBLIC_URL }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
