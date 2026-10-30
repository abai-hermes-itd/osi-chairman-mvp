import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseRegistration } from "@/lib/validation"

// Публичная подача заявки председателя. Ответ всегда одинаковый:
// по нему нельзя узнать, есть ли уже такой email или БИН в системе.
const ACCEPTED = { success: true, message: "Заявка принята. Оператор свяжется с вами." }

const MAX_PENDING = 200 // защита от переполнения очереди

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    // Скрытое поле-ловушка для ботов: люди его не заполняют
    if (body && typeof body === "object" && (body as Record<string, unknown>).website) {
      return NextResponse.json(ACCEPTED)
    }

    const parsed = parseRegistration(body)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const data = parsed.data

    const pending = await prisma.registrationRequest.count({ where: { status: "PENDING" } })
    if (pending >= MAX_PENDING) {
      return NextResponse.json(
        { error: "Приём заявок временно приостановлен. Попробуйте позже." },
        { status: 429 }
      )
    }

    const [existingUser, duplicate] = await Promise.all([
      prisma.user.findUnique({ where: { email: data.email }, select: { id: true } }),
      prisma.registrationRequest.findFirst({
        where: {
          status: "PENDING",
          OR: [{ email: data.email }, { osiBin: data.osiBin }],
        },
        select: { id: true },
      }),
    ])

    if (!existingUser && !duplicate) {
      await prisma.registrationRequest.create({ data })
    }

    return NextResponse.json(ACCEPTED)
  } catch (error) {
    console.error("Ошибка подачи заявки:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
