import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth"
import { getPassport, parsePassportInput } from "@/lib/passport"

export const dynamic = "force-dynamic"

// Паспорт МКД текущего председателя. Вход проверяет middleware,
// здесь дополнительно берём пользователя и его ОСИ из БД.
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Требуется вход" }, { status: 401 })

    return NextResponse.json(await getPassport(user.osiId))
  } catch (error) {
    console.error("Не удалось прочитать паспорт МКД:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}

// Сохранение паспорта в таблицу Osi (раньше писалось в house.md)
export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Требуется вход" }, { status: 401 })
    if (user.role !== "CHAIRMAN") {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
    }
    if (!user.osiId) {
      return NextResponse.json({ error: "Пользователь не привязан к ОСИ" }, { status: 409 })
    }

    const parsed = parsePassportInput(await request.json().catch(() => null))
    if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 })

    await prisma.osi.update({
      where: { id: user.osiId },
      data: { ...parsed.data, status: "ACTIVE" },
    })

    return NextResponse.json(await getPassport(user.osiId))
  } catch (error) {
    console.error("Не удалось сохранить паспорт МКД:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
