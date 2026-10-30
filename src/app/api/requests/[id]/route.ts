import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireOsiUser } from "@/lib/auth"
import { isStatus } from "@/lib/requests"

export const dynamic = "force-dynamic"

// Карточка заявки (только из своей ОСИ)
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireOsiUser()
    if (!user) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })

    const item = await prisma.residentRequest.findFirst({
      where: { id: params.id, osiId: user.osiId },
      include: {
        media: { select: { id: true, kind: true, mimeType: true, size: true }, orderBy: { createdAt: "asc" } },
      },
    })
    if (!item) return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 })
    return NextResponse.json({ item })
  } catch (error) {
    console.error("Ошибка карточки заявки:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}

// Смена статуса: NEW, IN_PROGRESS, DONE, CANCELLED
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireOsiUser()
    if (!user) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })

    const body = await request.json().catch(() => null)
    if (!isStatus(body?.status)) return NextResponse.json({ error: "Неизвестный статус" }, { status: 400 })

    const res = await prisma.residentRequest.updateMany({
      where: { id: params.id, osiId: user.osiId },
      data: { status: body.status },
    })
    if (res.count === 0) return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Ошибка смены статуса:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
