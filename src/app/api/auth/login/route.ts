import { NextRequest, NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from "@/lib/session"

// Хеш-заглушка: сравниваем с ним, если пользователя нет,
// чтобы время ответа не выдавало, существует ли email
const DUMMY_HASH = "$2b$12$5TQgj1qqn/YQCU7rl81aIuzIvt6rQquDHuk0YUpN1/rmAX3vdDeZS"

const INVALID = { error: "Неверный email или пароль" }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body?.password === "string" ? body.password : ""

    if (!email || !password || password.length > 200) {
      return NextResponse.json(INVALID, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    const isValid = await compare(password, user?.passwordHash ?? DUMMY_HASH)

    if (!user || !user.passwordHash || !isValid) {
      return NextResponse.json(INVALID, { status: 401 })
    }

    const token = await createSessionToken(user.id)
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    })
    return response
  } catch (error) {
    console.error("Ошибка входа:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
