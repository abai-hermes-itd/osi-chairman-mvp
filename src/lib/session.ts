// Подписанные сессии без внешних библиотек.
// Только Web Crypto API: модуль работает и в middleware (Edge), и в Node.
// Токен: base64url(payload).base64url(HMAC-SHA256(payload))

export const SESSION_COOKIE = "osi_session"
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 дней, в секундах

export interface SessionPayload {
  uid: string
  exp: number // unix-время в секундах
}

const encoder = new TextEncoder()

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET не задан или короче 32 символов")
  }
  return secret
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(str: string): Uint8Array<ArrayBuffer> {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/")
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4)
  const bin = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function getKey(usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  )
}

export async function createSessionToken(userId: string): Promise<string> {
  const payload: SessionPayload = {
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  }
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)))
  const sig = await crypto.subtle.sign("HMAC", await getKey("sign"), encoder.encode(body))
  return `${body}.${toBase64Url(new Uint8Array(sig))}`
}

// Возвращает payload или null (подпись неверна, срок истёк, формат битый)
export async function verifySessionToken(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [body, sig] = parts

  try {
    // crypto.subtle.verify сравнивает подпись за постоянное время
    const ok = await crypto.subtle.verify(
      "HMAC",
      await getKey("verify"),
      fromBase64Url(sig),
      encoder.encode(body)
    )
    if (!ok) return null

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body)))
    if (typeof payload?.uid !== "string" || typeof payload?.exp !== "number") return null
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null
    return { uid: payload.uid, exp: payload.exp }
  } catch {
    return null
  }
}
