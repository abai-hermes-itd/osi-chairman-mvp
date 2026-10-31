import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashLoginToken } from "@/lib/emailLogin"
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from "@/lib/session"

export const dynamic = "force-dynamic"

const INVALID = { error: "Ссылка недействительна или устарела. Запросите новую на странице входа." }

// Подтверждение входа по ссылке из письма. Только POST: автоматическая проверка ссылок
// почтовыми сервисами (GET) не должна гасить одноразовый токен.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const token = typeof body?.token === "string" ? body.token : ""
    if (!token || token.length > 200) return NextResponse.json(INVALID, { status: 400 })

    const record = await prisma.passwordToken.findUnique({
      where: { tokenHash: hashLoginToken(token) },
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
    })
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(INVALID, { status: 400 })
    }

    // Условное обновление: повторное использование невозможно даже при гонке
    const consumed = await prisma.passwordToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    })
    if (consumed.count === 0) return NextResponse.json(INVALID, { status: 400 })

    const session = await createSessionToken(record.user.id)
    const response = NextResponse.json({ success: true, user: record.user })
    response.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    })
    return response
  } catch (error) {
    console.error("Ошибка входа по ссылке:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
