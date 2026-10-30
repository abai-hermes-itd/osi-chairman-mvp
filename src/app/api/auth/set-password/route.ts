import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { hashToken } from "@/lib/invite"
import { validatePassword } from "@/lib/validation"

const INVALID_LINK = { error: "Ссылка недействительна или устарела. Попросите оператора выдать новую." }

// Установка пароля по одноразовой ссылке от оператора
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const token = typeof body?.token === "string" ? body.token : ""
    const password = body?.password

    if (!token || token.length > 200) return NextResponse.json(INVALID_LINK, { status: 400 })

    const record = await prisma.passwordToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { id: true, email: true } } },
    })
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(INVALID_LINK, { status: 400 })
    }

    const passwordError = validatePassword(password, record.user.email)
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })

    const passwordHash = await hash(password as string, 12)

    // Токен гасится условным обновлением: повторное использование невозможно даже при гонке
    const consumed = await prisma.passwordToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    })
    if (consumed.count === 0) return NextResponse.json(INVALID_LINK, { status: 400 })

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.user.id }, data: { passwordHash } }),
      prisma.passwordToken.deleteMany({ where: { userId: record.user.id, usedAt: null } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Ошибка установки пароля:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
