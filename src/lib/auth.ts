import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session"

// Текущий пользователь по cookie сессии (только серверный код: route handlers, server components).
// Подпись проверяется, затем пользователь перечитывается из БД,
// поэтому удалённый пользователь теряет доступ сразу.
export async function getSessionUser() {
  const token = cookies().get(SESSION_COOKIE)?.value
  const payload = await verifySessionToken(token)
  if (!payload) return null

  return prisma.user.findUnique({
    where: { id: payload.uid },
    select: { id: true, email: true, name: true, role: true, osiId: true },
  })
}
