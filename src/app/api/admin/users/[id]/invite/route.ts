import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { createInviteLink } from "@/lib/invite"

export const dynamic = "force-dynamic"

// Новая ссылка «задать пароль»: если председатель потерял ссылку или забыл пароль.
// Прежние неиспользованные ссылки аннулируются.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true },
    })
    // Только председатели: операторов (ADMIN) так не сбрасываем
    if (!user || user.role !== "CHAIRMAN") {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    const invite = await createInviteLink(user.id, new URL(request.url).origin)
    return NextResponse.json({ success: true, inviteUrl: invite.url, expiresAt: invite.expiresAt })
  } catch (error) {
    console.error("Ошибка выдачи ссылки:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
