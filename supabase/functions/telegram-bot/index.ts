import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Configure via `supabase secrets set ADMIN_TELEGRAM_ID=... ADMIN_USERNAME=... TELEGRAM_WEBHOOK_SECRET=...`
// ADMIN_TELEGRAM_ID intentionally defaults to 0 (matches no real user) rather than a
// hardcoded ID, so the admin-only code paths fail closed until configured.
const ADMIN_TELEGRAM_ID = parseInt(Deno.env.get("ADMIN_TELEGRAM_ID") || "0", 10);
const ADMIN_USERNAME = Deno.env.get("ADMIN_USERNAME") || "";
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MINIAPP_URL = Deno.env.get("MINIAPP_URL") || `${SUPABASE_URL}/storage/v1/object/public/miniapp/index.html`;

// Shared secret Telegram sends back in the `X-Telegram-Bot-Api-Secret-Token`
// header on every webhook call (set via the `secret_token` param on setWebhook
// below). Without this, anyone who finds this function's public URL could POST
// a forged update — e.g. with `from.id` set to ADMIN_TELEGRAM_ID — and trigger
// admin-only actions such as broadcasting to every registered user.
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "";

// bot_users, bot_messages and pedagog_data are locked down to service-role
// access only (see 20260905160000_lock_down_rls_policies.sql), so this
// trusted server-side function must use the service-role key, not anon.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
  chat: { id: number; type: string };
  text?: string;
  caption?: string;
  contact?: { phone_number: string; user_id: number };
  photo?: { file_id: string; width: number; height: number }[];
  document?: { file_id: string; file_name?: string; mime_type?: string };
  video?: { file_id: string; duration?: number };
  audio?: { file_id: string; duration?: number; title?: string };
  voice?: { file_id: string; duration?: number };
  animation?: { file_id: string };
  sticker?: { file_id: string; emoji?: string };
  media_group_id?: string;
}

interface TelegramUpdate {
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: { id: number; first_name?: string; last_name?: string; username?: string };
    data?: string;
    message?: { chat: { id: number } };
  };
}

async function sendTelegramMessage(chatId: number, text: string, keyboard?: object): Promise<boolean> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
  };
  if (keyboard) body.reply_markup = keyboard;

  const resp = await fetch(`${API_URL}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await resp.json().catch(() => null);
  return resp.ok && !!json?.ok;
}

async function setBotMenu() {
  await fetch(`${API_URL}/setChatMenuButton`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      menu_button: {
        type: "web_app",
        text: "Mini App",
        web_app: { url: MINIAPP_URL },
      },
    }),
  });
}

async function getOrCreateUser(from: { id: number; first_name?: string; last_name?: string; username?: string }): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("bot_users")
    .select("*")
    .eq("telegram_id", from.id)
    .maybeSingle();

  if (error) {
    console.error("getOrCreateUser select failed:", error.message);
    return null;
  }
  if (data) return data;

  const { data: newUser, error: insertError } = await supabase.from("bot_users").insert({
    telegram_id: from.id,
    telegram_first_name: from.first_name || null,
    telegram_last_name: from.last_name || null,
    telegram_username: from.username || null,
    state: "new",
  }).select("*").single();

  if (insertError) {
    console.error("getOrCreateUser insert failed:", insertError.message);
    return null;
  }

  return newUser;
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

function getMessageType(msg: TelegramMessage): string {
  if (msg.photo) return "Rasm";
  if (msg.document) return "Fayl";
  if (msg.video) return "Video";
  if (msg.audio) return "Audio";
  if (msg.voice) return "Ovozli xabar";
  if (msg.animation) return "GIF";
  if (msg.sticker) return "Stiker";
  return "Media";
}

async function sendBroadcastMessage(chatId: number, message: TelegramMessage): Promise<boolean> {
  const prefix = "📢 <b>Admin xabari</b>\n\n";
  const caption = message.caption ? `${prefix}${message.caption}` : undefined;

  if (message.text) {
    return await sendTelegramMessage(chatId, `${prefix}${message.text}`);
  }

  const body: Record<string, unknown> = { chat_id: chatId, parse_mode: "HTML" };
  let method = "sendMessage";

  if (message.photo) {
    method = "sendPhoto";
    body.photo = message.photo[message.photo.length - 1].file_id;
    if (caption) body.caption = caption;
  } else if (message.document) {
    method = "sendDocument";
    body.document = message.document.file_id;
    if (caption) body.caption = caption;
  } else if (message.video) {
    method = "sendVideo";
    body.video = message.video.file_id;
    if (caption) body.caption = caption;
  } else if (message.audio) {
    method = "sendAudio";
    body.audio = message.audio.file_id;
    if (caption) body.caption = caption;
  } else if (message.voice) {
    method = "sendVoice";
    body.voice = message.voice.file_id;
    if (caption) body.caption = caption;
  } else if (message.animation) {
    method = "sendAnimation";
    body.animation = message.animation.file_id;
    if (caption) body.caption = caption;
  } else if (message.sticker) {
    method = "sendSticker";
    body.sticker = message.sticker.file_id;
    delete body.parse_mode;
  } else {
    method = "copyMessage";
    body.from_chat_id = message.chat.id;
    body.message_id = message.message_id;
    delete body.parse_mode;
  }

  const resp = await fetch(`${API_URL}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await resp.json().catch(() => null);
  return resp.ok && !!json?.ok;
}

async function broadcastMessageToUsers(message: TelegramMessage): Promise<number> {
  const { data: users } = await supabase
    .from("bot_users")
    .select("telegram_id")
    .neq("telegram_id", ADMIN_TELEGRAM_ID);

  let sent = 0;
  if (users) {
    for (const u of users) {
      try {
        const delivered = await sendBroadcastMessage(u.telegram_id, message);
        if (delivered) sent++;
      } catch {
        // skip failed sends
      }
    }
  }
  return sent;
}

async function forwardToAdmin(message: TelegramMessage, user: Record<string, unknown>) {
  const senderName = `${user.telegram_first_name || ""} ${user.telegram_last_name || ""}`.trim();
  const header = `📨 <b>Yangi xabar</b>\n\n👤 ${senderName}\n🆔 ${user.telegram_id}\n\n`;

  if (message.text) {
    await sendTelegramMessage(ADMIN_TELEGRAM_ID, `${header}💬 ${message.text}`);
    return;
  }

  await sendTelegramMessage(ADMIN_TELEGRAM_ID, `${header}📎 ${getMessageType(message)}`);
  await fetch(`${API_URL}/copyMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: ADMIN_TELEGRAM_ID,
      from_chat_id: message.chat.id,
      message_id: message.message_id,
    }),
  });
}

async function handleStart(user: Record<string, unknown>, chatId: number) {
  const name = (user.telegram_first_name as string) || "Foydalanuvchi";

  if (user.is_registered) {
    await sendTelegramMessage(
      chatId,
      `Assalomu alaykum, ${name}! 👋\n\nSiz allaqachon ro'yxatdan o'tgansiz. Ma'lumotlaringizni ko'rish uchun pastdagi "Mini App" tugmasini bosing.`,
      {
        inline_keyboard: [[
          { text: "📱 Mini App ni ochish", web_app: { url: MINIAPP_URL } },
        ]],
      }
    );
    return;
  }

  await updateUser(user.telegram_id as number, { state: "awaiting_contact" });

  await sendTelegramMessage(
    chatId,
    `Assalomu alaykum, ${name}! 👋\n\nMen <b>IT O'qituvchilar Namangan</b> botiman.\n\nDavom etish uchun kontaktingizni ulashing.`,
    {
      keyboard: {
        keyboard: [[{ text: "📱 Kontaktni ulashish", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  );
}

async function handleContact(user: Record<string, unknown>, chatId: number, phone: string) {
  await updateUser(user.telegram_id as number, {
    phone_number: phone,
    state: "awaiting_pinfl",
  });

  await sendTelegramMessage(
    chatId,
    `Rahmat! Kontakt qabul qilindi. ✅\n\nEndi PINFL raqamingizni kiriting.\n\n📌 PINFL — 14 ta raqamdan iborat shaxsingizni identifikatsiya qiluvchi raqam.`,
    { keyboard: { remove_keyboard: true } }
  );
}

async function handlePinfl(user: Record<string, unknown>, chatId: number, pinfl: string) {
  const cleanPinfl = pinfl.trim();

  if (cleanPinfl.length !== 14 || !/^\d+$/.test(cleanPinfl)) {
    await sendTelegramMessage(chatId, "PINFL 14 ta raqamdan iborat bo'lishi kerak. Iltimos, qaytadan kiriting.");
    return;
  }

  const { data: pedagog, error: pedagogError } = await supabase
    .from("pedagog_data")
    .select("*")
    .eq("pinfl", cleanPinfl)
    .maybeSingle();

  if (pedagogError) {
    console.error("pedagog_data lookup failed:", pedagogError.message);
    await sendTelegramMessage(chatId, "Ma'lumotlarni tekshirishda xatolik yuz berdi. Iltimos, birozdan so'ng qaytadan urinib ko'ring.");
    return;
  }

  if (!pedagog) {
    await updateUser(user.telegram_id as number, { pinfl: cleanPinfl, state: "not_found" });

    // Previously this button linked to the *user's own* Telegram profile
    // (`user.telegram_username`) instead of the admin's — a copy-paste bug
    // that sent people to themselves instead of to support. It now points at
    // ADMIN_USERNAME (a configured contact) and is only shown when that is
    // set, since we don't have a reliable public link for the admin otherwise.
    await sendTelegramMessage(
      chatId,
      `⚠️ Sizning PINFL raqamingiz ma'lumotlar bazasida topilmadi.\n\nAgar siz Namangan shahar maktablarida faoliyat yuratayotgan bo'lsangiz, iltimos adminga murojaat qiling.${ADMIN_USERNAME ? `\n\n👤 Admin: @${ADMIN_USERNAME}` : ""}\n\nYoki qaytadan urinib ko'ring.`,
      ADMIN_USERNAME
        ? {
            inline_keyboard: [[
              { text: "👤 Adminga murojaat qilish", url: `https://t.me/${ADMIN_USERNAME}` },
            ]],
          }
        : undefined
    );

    await sendTelegramMessage(
      ADMIN_TELEGRAM_ID,
      `🔔 <b>Yangi foydalanuvchi PINFL topilmadi</b>\n\n👤 Ism: ${user.telegram_first_name || ""} ${user.telegram_last_name || ""}\n🆔 Telegram ID: ${user.telegram_id}\n📞 Telefon: ${user.phone_number || "—"}\n🔢 PINFL: ${cleanPinfl}`,
    );

    return;
  }

  await updateUser(user.telegram_id as number, {
    pinfl: cleanPinfl,
    pedagog_data_id: pedagog.id,
    is_registered: true,
    state: "registered",
  });

  const certInfo = pedagog.certificate_name
    ? `\n🎓 Sertifikat: ${pedagog.certificate_name}\n📅 Olingan: ${pedagog.certificate_issue_date || "—"}\n📅 Tugaydi: ${pedagog.certificate_expiry_date || "—"}`
    : "";

  await sendTelegramMessage(
    chatId,
    `✅ Tabriklaymiz! Siz muvaffaqiyatli ro'yxatdan o'tdingiz.\n\n📋 <b>Sizning ma'lumotlaringiz:</b>\n👤 FIO: ${pedagog.full_name}\n🏫 Maktab: ${pedagog.school}\n📊 Toifa: ${pedagog.category}\n⏰ Dars soati: ${pedagog.lesson_hours}${certInfo}\n\nMa'lumotlaringizni va reytingingizni ko'rish uchun "Mini App" tugmasini bosing.`,
    {
      inline_keyboard: [[
        { text: "📱 Mini App ni ochish", web_app: { url: MINIAPP_URL } }],
      ],
    }
  );

  await sendTelegramMessage(
    ADMIN_TELEGRAM_ID,
    `✅ <b>Yangi o'qituvchi ro'yxatdan o'tdi</b>\n\n👤 ${pedagog.full_name}\n🏫 ${pedagog.school}\n📊 ${pedagog.category}\n🆔 Telegram: ${user.telegram_id}\n📞 ${user.phone_number || "—"}`,
  );
}

async function handleUserMessage(user: Record<string, unknown>, chatId: number, text: string) {
  if (user.telegram_id === ADMIN_TELEGRAM_ID) {
    await sendTelegramMessage(
      chatId,
      `Assalomu alaykum, Admin! 👑\n\nQuyidagi amallardan birini tanlang:`,
      {
        inline_keyboard: [
          [{ text: "📢 Barcha foydalanuvchilarga xabar yuborish", callback_data: "broadcast" }],
          [{ text: "📱 Mini App ni ochish", web_app: { url: MINIAPP_URL } }],
        ],
      }
    );
    return;
  }

  await saveMessage("from_user", user.telegram_id as number, ADMIN_TELEGRAM_ID, text);

  await sendTelegramMessage(
    chatId,
    `Xabaringiz adminga yuborildi. ✅\n\nTez orada javob beriladi.`,
  );

  const senderName = `${user.telegram_first_name || ""} ${user.telegram_last_name || ""}`.trim();
  await sendTelegramMessage(
    ADMIN_TELEGRAM_ID,
    `📨 <b>Yangi xabar</b>\n\n👤 ${senderName}\n🆔 ${user.telegram_id}\n\n💬 ${text}`,
  );
}

async function handleCallback(callbackQuery: { from: { id: number }; data?: string }, chatId: number) {
  const { data: query } = callbackQuery;

  if (query === "broadcast") {
    await updateUser(ADMIN_TELEGRAM_ID, { state: "admin_broadcast" });
    await sendTelegramMessage(chatId, "📢 Yubormoqchi bo'lgan xabaringizni yuboring (matn, rasm, fayl, video va h.k.):");
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const isSetupCall = ["setWebhook", "setMenu", "webhookInfo", "getMe", "testMessage"].some(
      (p) => url.searchParams.get(p) === "true"
    );

    // These are one-time developer setup/debug actions (they can hijack the
    // webhook, spam the admin's chat, or leak bot info), so they require the
    // same shared secret as the webhook itself rather than being wide open.
    if (isSetupCall) {
      if (!WEBHOOK_SECRET || url.searchParams.get("secret") !== WEBHOOK_SECRET) {
        return new Response(JSON.stringify({ error: "Unauthorized. Pass ?secret=<TELEGRAM_WEBHOOK_SECRET>." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (url.searchParams.get("setWebhook") === "true") {
      const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-bot`;
      const resp = await fetch(`${API_URL}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl, secret_token: WEBHOOK_SECRET || undefined }),
      });
      const data = await resp.json();
      await setBotMenu();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (url.searchParams.get("setMenu") === "true") {
      await setBotMenu();
      return new Response(JSON.stringify({ ok: true, message: "Menu set" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (url.searchParams.get("webhookInfo") === "true") {
      const resp = await fetch(`${API_URL}/getWebhookInfo`);
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (url.searchParams.get("getMe") === "true") {
      const resp = await fetch(`${API_URL}/getMe`);
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (url.searchParams.get("testMessage") === "true") {
      const delivered = await sendTelegramMessage(ADMIN_TELEGRAM_ID, "🧪 <b>Test xabar</b>\n\nBot muvaffaqiyatli ishlayapti! Webhook va Mini App sozlangan.");
      return new Response(JSON.stringify({ ok: delivered }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ status: "bot running" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify the update genuinely came from Telegram (see WEBHOOK_SECRET above).
  // Fails closed: if the secret hasn't been configured yet, POSTs are
  // rejected rather than trusted, so the bot can't be driven by forged
  // updates (e.g. spoofed `from.id` impersonating the admin) by default.
  if (!WEBHOOK_SECRET || req.headers.get("X-Telegram-Bot-Api-Secret-Token") !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const update: TelegramUpdate = await req.json();

    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat?.id || cq.from.id;
      await handleCallback(cq, chatId);
      await fetch(`${API_URL}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cq.id }),
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const msg = update.message;
    if (!msg) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatId = msg.chat.id;
    const from = msg.from!;
    const user = await getOrCreateUser(from);

    if (!user) {
      await sendTelegramMessage(chatId, "Vaqtinchalik texnik xatolik yuz berdi. Iltimos, birozdan so'ng qaytadan urinib ko'ring.");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Contact sharing
    if (msg.contact) {
      await handleContact(user, chatId, msg.contact.phone_number);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin broadcast mode — accepts ANY message type
    if (user.telegram_id === ADMIN_TELEGRAM_ID && user.state === "admin_broadcast") {
      const sent = await broadcastMessageToUsers(msg);
      await updateUser(ADMIN_TELEGRAM_ID, { state: "registered" });
      const contentDesc = msg.text || msg.caption || `[${getMessageType(msg)}]`;
      await saveMessage("from_admin", ADMIN_TELEGRAM_ID, null, contentDesc, true);
      await sendTelegramMessage(chatId, `✅ Xabaringiz ${sent} ta foydalanuvchiga yuborildi.`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Text messages
    if (msg.text) {
      if (msg.text === "/start" || msg.text.startsWith("/start ") || msg.text.startsWith("/start@")) {
        await handleStart(user, chatId);
      } else if (user.state === "awaiting_contact") {
        await sendTelegramMessage(chatId, "Iltimos, kontaktingizni ulashish uchun pastdagi \"📱 Kontaktni ulashish\" tugmasini bosing.", {
          keyboard: {
            keyboard: [[{ text: "📱 Kontaktni ulashish", request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
      } else if (user.state === "awaiting_pinfl" || user.state === "not_found") {
        await handlePinfl(user, chatId, msg.text);
      } else {
        await handleUserMessage(user, chatId, msg.text);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Non-text messages from regular users — forward to admin
    if (user.telegram_id !== ADMIN_TELEGRAM_ID) {
      if (user.state === "awaiting_contact") {
        await sendTelegramMessage(chatId, "Iltimos, avval kontaktingizni ulashing.", {
          keyboard: {
            keyboard: [[{ text: "📱 Kontaktni ulashish", request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
      } else if (user.state === "awaiting_pinfl" || user.state === "not_found") {
        await sendTelegramMessage(chatId, "Iltimos, PINFL raqamingizni matn ko'rinishida kiriting (14 ta raqam).");
      } else {
        const contentDesc = msg.caption || `[${getMessageType(msg)}]`;
        await saveMessage("from_user", user.telegram_id as number, ADMIN_TELEGRAM_ID, contentDesc);
        await forwardToAdmin(msg, user);
        await sendTelegramMessage(chatId, "Xabaringiz adminga yuborildi. ✅\n\nTez orada javob beriladi.");
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
