import { NextRequest, NextResponse } from "next/server"
import { compare, hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth"
import { devBypass } from "@/lib/devBypass"
import { validatePassword } from "@/lib/validation"

// Смена пароля вошедшим пользователем (нужен текущий пароль)
export async function POST(request: NextRequest) {
  try {
    // В режиме без входа (только локально) «текущий пользователь» условный: менять пароль нельзя
    if (devBypass()) {
      return NextResponse.json({ error: "Недоступно в режиме без входа" }, { status: 403 })
    }

    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: "Требуется вход" }, { status: 401 })

    const body = await request.json().catch(() => null)
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : ""
    const newPassword = body?.newPassword

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, email: true, passwordHash: true },
    })
    if (!user?.passwordHash || !(await compare(currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Текущий пароль неверный" }, { status: 400 })
    }

    const passwordError = validatePassword(newPassword, user.email)
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })
    if (newPassword === currentPassword) {
      return NextResponse.json({ error: "Новый пароль должен отличаться от текущего" }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hash(newPassword as string, 12) },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Ошибка смены пароля:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
