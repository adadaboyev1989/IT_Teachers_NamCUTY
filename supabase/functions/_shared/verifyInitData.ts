// Verifies a Telegram Mini App `initData` string server-side, per:
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
//
// Every miniapp-api request carries the client's raw signed initData rather
// than a bare telegram_id, specifically so a caller can't just claim to be
// any teacher — the HMAC below can only have been produced by Telegram
// itself (it's keyed off the bot token, which never reaches the client).

async function hmacSha256(keyBytes: Uint8Array, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60;

export type TelegramInitDataUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export async function verifyTelegramInitData(initData: string | undefined | null, botToken: string): Promise<TelegramInitDataUser | null> {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = await hmacSha256(new TextEncoder().encode("WebAppData"), botToken);
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
