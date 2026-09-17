import { getInitData } from './telegram'

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/miniapp-api`

// Every call carries the raw signed Telegram initData; miniapp-api verifies
// it server-side and resolves it to a pedagog_data_id itself — the client
// never tells the server "who it is" directly.
export async function callMiniApi<T = Record<string, unknown>>(path: string, body: Record<string, unknown> = {}): Promise<T & { ok: boolean; error?: string }> {
  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: getInitData(), ...body }),
    })
    return await resp.json()
  } catch {
    // Network failure (offline, DNS, etc.) — surface it the same way an API
    // error would be, so callers only ever need to check `res.ok` and never
    // need a separate try/catch around every callMiniApi call.
    return { ok: false, error: "Tarmoq bilan bog'lanib bo'lmadi. Internet aloqasini tekshiring." } as T & { ok: boolean; error?: string }
  }
}
