import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })

    const body = await request.json().catch(() => null)
    const reason =
      typeof body?.reason === "string" && body.reason.trim().length > 0
        ? body.reason.trim().slice(0, 500)
        : null

    // Меняем статус только у ещё не обработанной заявки
    const result = await prisma.registrationRequest.updateMany({
      where: { id: params.id, status: "PENDING" },
      data: {
        status: "REJECTED",
        rejectReason: reason,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    })
    if (result.count === 0) {
      return NextResponse.json({ error: "Заявка не найдена или уже обработана" }, { status: 409 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Ошибка отклонения заявки:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
