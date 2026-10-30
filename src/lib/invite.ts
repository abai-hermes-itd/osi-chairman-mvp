import { createHash, randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"

// Срок действия ссылки «задать пароль»
export const INVITE_TTL_HOURS = 72

export function generateToken(): string {
  return randomBytes(32).toString("base64url")
}

// В БД хранится только хеш: утечка базы не раскрывает рабочие ссылки
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

// Выдаёт новую ссылку; все прежние неиспользованные ссылки пользователя аннулируются.
// Возвращает ссылку (показывается оператору один раз) и срок действия.
export async function createInviteLink(
  userId: string,
  origin: string
): Promise<{ url: string; expiresAt: Date }> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000)

  await prisma.$transaction([
    prisma.passwordToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt },
    }),
  ])

  return { url: `${origin}/set-password?token=${token}`, expiresAt }
}
