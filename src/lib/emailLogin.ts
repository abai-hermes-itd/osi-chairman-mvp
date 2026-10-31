import { createHash } from "crypto"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateToken } from "@/lib/invite"

// Вход по одноразовой ссылке из письма.
// Токены хранятся в той же таблице PasswordToken, что и ссылки «задать пароль»,
// но хеш считается с префиксом: ссылка для входа не подходит для смены пароля и наоборот.

export const LOGIN_TTL_MINUTES = 15
// Не больше стольких ссылок на пользователя за окно (защита от спама письмами)
export const LOGIN_MAX_PER_WINDOW = 3

export function hashLoginToken(token: string): string {
  return createHash("sha256").update("login:" + token).digest("hex")
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Нормализует email из запроса; null, если это не похоже на адрес
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null
  const email = value.trim().toLowerCase()
  if (email.length === 0 || email.length > 254 || !EMAIL_RE.test(email)) return null
  return email
}

// Адрес сайта для ссылки в письме. В production берётся только из APP_URL:
// заголовок Host подделывается, и ссылка с чужим доменом выдала бы токен злоумышленнику.
export function appOrigin(request: NextRequest): string | null {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, "")
  if (configured) return configured
  if (process.env.NODE_ENV !== "production") return request.nextUrl.origin
  return null
}

// Создаёт ссылку для входа; null, если превышен лимит
export async function issueLoginLink(userId: string, origin: string): Promise<string | null> {
  const since = new Date(Date.now() - LOGIN_TTL_MINUTES * 60 * 1000)
  const recent = await prisma.passwordToken.count({ where: { userId, createdAt: { gte: since } } })
  if (recent >= LOGIN_MAX_PER_WINDOW) return null

  const token = generateToken()
  await prisma.passwordToken.create({
    data: {
      userId,
      tokenHash: hashLoginToken(token),
      expiresAt: new Date(Date.now() + LOGIN_TTL_MINUTES * 60 * 1000),
    },
  })
  return `${origin}/login/email?token=${token}`
}

export function loginMail(url: string): { subject: string; text: string } {
  return {
    subject: "Вход в Кабинет председателя ОСИ",
    text:
      "Ссылка для входа в Кабинет председателя ОСИ:\n\n" +
      `${url}\n\n` +
      `Она действует ${LOGIN_TTL_MINUTES} минут и срабатывает один раз.\n` +
      "Если вы не запрашивали вход, просто проигнорируйте это письмо.",
  }
}
