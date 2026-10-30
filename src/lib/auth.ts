import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session"
import { devBypass } from "@/lib/devBypass"

// Текущий пользователь по cookie сессии (только серверный код: route handlers, server components).
// Подпись проверяется, затем пользователь перечитывается из БД,
// поэтому удалённый пользователь теряет доступ сразу.
export async function getSessionUser() {
  // Только локально (next dev + DEV_AUTH_BYPASS=1): работаем от имени первого председателя
  if (devBypass()) {
    return prisma.user.findFirst({
      where: { role: "CHAIRMAN" },
      select: { id: true, email: true, name: true, role: true, osiId: true },
    })
  }

  const token = cookies().get(SESSION_COOKIE)?.value
  const payload = await verifySessionToken(token)
  if (!payload) return null

  return prisma.user.findUnique({
    where: { id: payload.uid },
    select: { id: true, email: true, name: true, role: true, osiId: true },
  })
}

// Оператор (роль ADMIN): проверка прав для /admin и /api/admin
export async function requireAdmin() {
  const user = await getSessionUser()
  return user && user.role === "ADMIN" ? user : null
}

// Пользователь, привязанный к ОСИ (председатель). Все данные заявок фильтруются по его osiId.
export async function requireOsiUser() {
  const user = await getSessionUser()
  if (!user || !user.osiId) return null
  return { id: user.id, role: user.role, osiId: user.osiId as string }
}
