import { Bot, webhookCallback, InlineKeyboard, Keyboard, type Context } from "https://deno.land/x/grammy@v1.21.1/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// Configure via `supabase secrets set ADMIN_TELEGRAM_ID=... ADMIN_USERNAME=...
// TELEGRAM_WEBHOOK_SECRET=... TASK_GROUP_URL=...`. ADMIN_TELEGRAM_ID defaults
// to 0 (matches no real user) so admin-only code paths fail closed until
// configured, rather than silently trusting a hardcoded id.
const ADMIN_TELEGRAM_ID = parseInt(Deno.env.get("ADMIN_TELEGRAM_ID") || "0", 10);
const ADMIN_USERNAME = Deno.env.get("ADMIN_USERNAME") || "";
const TASK_GROUP_URL = Deno.env.get("TASK_GROUP_URL") || "";
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
// No fallback default: MINIAPP_URL must be the public HTTPS URL where the
// built Mini App frontend (the src/miniapp React app, not the miniapp-api
// backend — that only returns JSON, never an HTML page) is hosted. Every
// place that would show a Mini App button checks MINIAPP_URL first and
// simply omits the button if it's unset, rather than pointing Telegram at
// a URL that can't render as a WebApp.
const MINIAPP_URL = Deno.env.get("MINIAPP_URL") || "";

// Shared secret Telegram echoes back in the X-Telegram-Bot-Api-Secret-Token
// header on every webhook call. Without checking it, anyone who finds this
// function's public URL could POST a forged update (e.g. with `from.id` set
// to ADMIN_TELEGRAM_ID) and trigger admin-only actions like broadcasting to
// every registered teacher.
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "";

// bot_users/bot_messages/pedagog_data are locked down to service-role access
// only (see supabase/migrations), so this trusted server-side function uses
// the service-role key, never the anon key.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type BotUser = {
  telegram_id: number;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  phone_number: string | null;
  pinfl: string | null;
  pedagog_data_id: string | null;
  is_registered: boolean;
  state: string;
  last_seen_at: string | null;
};

// Touches last_seen_at (and refreshes the cached Telegram name/username) on
// every single call, so it doubles as "record this interaction" — the admin
// panel's Bot holati tab relies on last_seen_at actually moving on ordinary
// messages, not just registration-flow steps like updateUser's callers do.
async function getOrCreateUser(from: { id: number; first_name?: string; last_name?: string; username?: string }): Promise<BotUser | null> {
  const now = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("bot_users")
    .update({
      last_seen_at: now,
      telegram_username: from.username || null,
      telegram_first_name: from.first_name || null,
      telegram_last_name: from.last_name || null,
    })
    .eq("telegram_id", from.id)
    .select("*")
    .maybeSingle();

  if (updateError) {
    console.error("getOrCreateUser update failed:", updateError.message);
    return null;
  }
  if (updated) return updated;

  const { data: created, error: insertError } = await supabase
    .from("bot_users")
    .insert({
      telegram_id: from.id,
      telegram_first_name: from.first_name || null,
      telegram_last_name: from.last_name || null,
      telegram_username: from.username || null,
      state: "new",
      last_seen_at: now,
    })
    .select("*")
    .single();

  if (insertError) {
    console.error("getOrCreateUser insert failed:", insertError.message);
    return null;
  }
  return created;
}

async function updateUser(telegramId: number, updates: Record<string, unknown>): Promise<boolean> {
  const { error } = await supabase
    .from("bot_users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("telegram_id", telegramId);
  if (error) {
    console.error("updateUser failed:", error.message);
    return false;
  }
  return true;
}

async function saveMessage(direction: string, senderId: number, recipientId: number | null, content: string, isBroadcast = false) {
  await supabase.from("bot_messages").insert({
    direction,
    sender_telegram_id: senderId,
    recipient_telegram_id: recipientId,
    content,
    is_broadcast: isBroadcast,
  });
}

function miniAppKeyboard(label = "📱 Mini App ni ochish"): InlineKeyboard | undefined {
  if (!MINIAPP_URL) return undefined;
  return new InlineKeyboard().webApp(label, MINIAPP_URL);
}

const bot = new Bot(BOT_TOKEN);

bot.command("start", async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  const user = await getOrCreateUser(from);
  if (!user) {
    await ctx.reply("Vaqtinchalik texnik xatolik yuz berdi. Iltimos, birozdan so'ng qaytadan urinib ko'ring.");
    return;
  }

  const name = user.telegram_first_name || "Foydalanuvchi";

  if (user.is_registered) {
    await ctx.reply(
      `Assalomu alaykum, ${name}! 👋\n\nSiz allaqachon ro'yxatdan o'tgansiz. Profilingiz, reytingingiz va o'yinlarni ko'rish uchun pastdagi tugmani bosing.`,
      { reply_markup: miniAppKeyboard() }
    );
    return;
  }

  await updateUser(from.id, { state: "awaiting_contact" });
  await ctx.reply(
    `Assalomu alaykum, ${name}! 👋\n\nMen <b>IT O'qituvchilar Namangan</b> botiman.\n\nDavom etish uchun kontaktingizni ulashing.`,
    {
      parse_mode: "HTML",
      reply_markup: new Keyboard().requestContact("📱 Kontaktni ulashish").resized().oneTime(),
    }
  );
});

bot.on("message:contact", async (ctx) => {
  const from = ctx.from;
  const contact = ctx.message.contact;
  if (!from || !contact) return;

  await updateUser(from.id, { phone_number: contact.phone_number, state: "awaiting_pinfl" });
  await ctx.reply(
    "Rahmat! Kontakt qabul qilindi. ✅\n\nEndi JSHSHIR (PINFL) raqamingizni kiriting.\n\n📌 14 ta raqamdan iborat bo'lishi kerak.",
    { reply_markup: { remove_keyboard: true } }
  );
});

async function handlePinfl(ctx: Context, user: BotUser, pinfl: string) {
  const cleanPinfl = pinfl.trim();
  if (cleanPinfl.length !== 14 || !/^\d+$/.test(cleanPinfl)) {
    await ctx.reply("JSHSHIR 14 ta raqamdan iborat bo'lishi kerak. Iltimos, qaytadan kiriting.");
    return;
  }

  const { data: pedagog, error } = await supabase.from("pedagog_data").select("*").eq("pinfl", cleanPinfl).maybeSingle();
  if (error) {
    console.error("pedagog_data lookup failed:", error.message);
    await ctx.reply("Ma'lumotlarni tekshirishda xatolik yuz berdi. Birozdan so'ng qaytadan urinib ko'ring.");
    return;
  }

  if (!pedagog) {
    await updateUser(user.telegram_id, { pinfl: cleanPinfl, state: "not_found" });
    await ctx.reply(
      `⚠️ Sizning JSHSHIR raqamingiz ma'lumotlar bazasida topilmadi.\n\nAgar siz Namangan shahar maktablarida faoliyat yuritayotgan bo'lsangiz, iltimos adminga murojaat qiling.${ADMIN_USERNAME ? `\n\n👤 Admin: @${ADMIN_USERNAME}` : ""}\n\nYoki qaytadan urinib ko'ring.`,
      ADMIN_USERNAME ? { reply_markup: new InlineKeyboard().url("👤 Adminga murojaat qilish", `https://t.me/${ADMIN_USERNAME}`) } : undefined
    );
    if (ADMIN_TELEGRAM_ID) {
      await bot.api.sendMessage(
        ADMIN_TELEGRAM_ID,
        `🔔 <b>Yangi foydalanuvchi JSHSHIR topilmadi</b>\n\n👤 ${user.telegram_first_name || ""} ${user.telegram_last_name || ""}\n🆔 Telegram ID: ${user.telegram_id}\n📞 ${user.phone_number || "—"}\n🔢 JSHSHIR: ${cleanPinfl}`,
        { parse_mode: "HTML" }
      );
    }
    return;
  }

  await updateUser(user.telegram_id, {
    pinfl: cleanPinfl,
    pedagog_data_id: pedagog.id,
    is_registered: true,
    state: "registered",
  });

  await ctx.reply(
    `✅ Tabriklaymiz! Siz muvaffaqiyatli ro'yxatdan o'tdingiz.\n\n📋 <b>Sizning ma'lumotlaringiz:</b>\n👤 FIO: ${pedagog.full_name}\n🏫 Maktab: ${pedagog.school}\n📊 Toifa: ${pedagog.category}\n\nProfilingiz, reytingingiz, quest va battle o'yinlarini ko'rish uchun pastdagi tugmani bosing.`,
    { parse_mode: "HTML", reply_markup: miniAppKeyboard() }
  );

  if (ADMIN_TELEGRAM_ID) {
    await bot.api.sendMessage(
      ADMIN_TELEGRAM_ID,
      `✅ <b>Yangi o'qituvchi ro'yxatdan o'tdi</b>\n\n👤 ${pedagog.full_name}\n🏫 ${pedagog.school}\n📊 ${pedagog.category}\n🆔 ${user.telegram_id}\n📞 ${user.phone_number || "—"}`,
      { parse_mode: "HTML" }
    );
  }
}

bot.on("callback_query:data", async (ctx) => {
  const from = ctx.from;
  if (from.id === ADMIN_TELEGRAM_ID && ctx.callbackQuery.data === "broadcast") {
    await updateUser(ADMIN_TELEGRAM_ID, { state: "admin_broadcast" });
    await ctx.reply("📢 Yubormoqchi bo'lgan xabaringizni yuboring (matn, rasm, fayl, video va h.k.):");
  }
  await ctx.answerCallbackQuery();
});

bot.on("message:text", async (ctx) => {
  const from = ctx.from;
  const text = ctx.message.text;
  if (!from || text.startsWith("/")) return;

  const user = await getOrCreateUser(from);
  if (!user) {
    await ctx.reply("Vaqtinchalik texnik xatolik yuz berdi. Iltimos, birozdan so'ng qaytadan urinib ko'ring.");
    return;
  }

  // Admin broadcast mode — the next message they send goes to everyone.
  if (user.telegram_id === ADMIN_TELEGRAM_ID && user.state === "admin_broadcast") {
    const sent = await broadcastToUsers(`📢 <b>Admin xabari</b>\n\n${text}`);
    await updateUser(ADMIN_TELEGRAM_ID, { state: "registered" });
    await saveMessage("from_admin", ADMIN_TELEGRAM_ID, null, text, true);
    await ctx.reply(`✅ Xabaringiz ${sent} ta foydalanuvchiga yuborildi.`);
    return;
  }

  if (user.telegram_id === ADMIN_TELEGRAM_ID) {
    const adminKeyboard = new InlineKeyboard().text("📢 Barcha foydalanuvchilarga xabar yuborish", "broadcast");
    if (MINIAPP_URL) adminKeyboard.row().webApp("📱 Mini App ni ochish", MINIAPP_URL);
    await ctx.reply("Assalomu alaykum, Admin! 👑", { reply_markup: adminKeyboard });
    return;
  }

  if (user.state === "awaiting_contact") {
    await ctx.reply('Iltimos, kontaktingizni ulashish uchun pastdagi "📱 Kontaktni ulashish" tugmasini bosing.', {
      reply_markup: new Keyboard().requestContact("📱 Kontaktni ulashish").resized().oneTime(),
    });
    return;
  }

  if (user.state === "awaiting_pinfl" || user.state === "not_found") {
    await handlePinfl(ctx, user, text);
    return;
  }

  // Anything else from a registered user is forwarded to the admin as a
  // two-way support chat.
  await saveMessage("from_user", user.telegram_id, ADMIN_TELEGRAM_ID, text);
  await ctx.reply("Xabaringiz adminga yuborildi. ✅\n\nTez orada javob beriladi.");
  if (ADMIN_TELEGRAM_ID) {
    const senderName = `${user.telegram_first_name || ""} ${user.telegram_last_name || ""}`.trim();
    await bot.api.sendMessage(
      ADMIN_TELEGRAM_ID,
      `📨 <b>Yangi xabar</b>\n\n👤 ${senderName}\n🆔 ${user.telegram_id}\n\n💬 ${text}`,
      { parse_mode: "HTML" }
    );
  }
});

async function broadcastToUsers(text: string): Promise<number> {
  const { data: users } = await supabase.from("bot_users").select("telegram_id").neq("telegram_id", ADMIN_TELEGRAM_ID).eq("is_registered", true);
  let sent = 0;
  for (const u of users || []) {
    try {
      await bot.api.sendMessage(u.telegram_id, text, { parse_mode: "HTML" });
      sent++;
    } catch {
      // Skip users who blocked the bot or otherwise can't be reached.
    }
  }
  return sent;
}

// Called by the (JWT-protected) notify-task edge function so the admin
// panel never needs this function's own webhook secret client-side.
export async function notifyTaskAnnouncement(title: string, points: number): Promise<number> {
  const groupLine = TASK_GROUP_URL ? `\n\n👥 Bajarish va topshirish: ${TASK_GROUP_URL}` : "";
  return await broadcastToUsers(`📝 <b>Yangi topshiriq!</b>\n\n${title}\n\n⭐ ${points} ball${groupLine}`);
}

const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);

  if (req.method === "GET") {
    const isSetupCall = ["setWebhook", "setMenu", "webhookInfo", "getMe", "testMessage"].some((p) => url.searchParams.get(p) === "true");

    // One-time developer setup/debug actions — gated behind the same shared
    // secret as the webhook itself, since they can hijack the webhook or
    // spam the admin's chat.
    if (isSetupCall && (!WEBHOOK_SECRET || url.searchParams.get("secret") !== WEBHOOK_SECRET)) {
      return new Response(JSON.stringify({ error: "Unauthorized. Pass ?secret=<TELEGRAM_WEBHOOK_SECRET>." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (url.searchParams.get("setWebhook") === "true") {
      const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-bot`;
      const webhookSet = await bot.api.setWebhook(webhookUrl, { secret_token: WEBHOOK_SECRET || undefined });
      if (MINIAPP_URL) await bot.api.setChatMenuButton({ menu_button: { type: "web_app", text: "Mini App", web_app: { url: MINIAPP_URL } } });
      return new Response(JSON.stringify({ webhookSet, miniAppMenuButtonSet: !!MINIAPP_URL }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (url.searchParams.get("setMenu") === "true") {
      if (!MINIAPP_URL) {
        return new Response(JSON.stringify({ ok: false, error: "MINIAPP_URL not configured" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await bot.api.setChatMenuButton({ menu_button: { type: "web_app", text: "Mini App", web_app: { url: MINIAPP_URL } } });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (url.searchParams.get("webhookInfo") === "true") {
      const info = await bot.api.getWebhookInfo();
      return new Response(JSON.stringify(info), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (url.searchParams.get("getMe") === "true") {
      const me = await bot.api.getMe();
      return new Response(JSON.stringify(me), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (url.searchParams.get("testMessage") === "true") {
      if (!ADMIN_TELEGRAM_ID) {
        return new Response(JSON.stringify({ ok: false, error: "ADMIN_TELEGRAM_ID not configured" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await bot.api.sendMessage(ADMIN_TELEGRAM_ID, "🧪 <b>Test xabar</b>\n\nBot muvaffaqiyatli ishlayapti!", { parse_mode: "HTML" });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ status: "bot running" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Internal call from the notify-task edge function (same project, so it
  // can use the service-role key as a bearer token rather than a public
  // secret — nothing outside Supabase's own functions can present that key).
  if (url.searchParams.get("notifyTask") === "true") {
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json().catch(() => null);
    if (!body?.title || typeof body.points !== "number") {
      return new Response(JSON.stringify({ error: "title and points required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sent = await notifyTaskAnnouncement(body.title, body.points);
    return new Response(JSON.stringify({ ok: true, sent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // The actual Telegram webhook. Fails closed: if the secret hasn't been
  // configured yet, POSTs are rejected rather than trusted, so the bot can't
  // be driven by forged updates (e.g. a spoofed admin id) by default.
  if (!WEBHOOK_SECRET || req.headers.get("X-Telegram-Bot-Api-Secret-Token") !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    return await handleUpdate(req);
  } catch (err) {
    console.error("Webhook handling failed:", err);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
