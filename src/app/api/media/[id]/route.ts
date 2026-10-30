import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireOsiUser } from "@/lib/auth"

export const dynamic = "force-dynamic"

// Выдача фото: только пользователю той же ОСИ, что и заявка
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireOsiUser()
    if (!user) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })

    const media = await prisma.requestMedia.findFirst({
      where: { id: params.id, request: { osiId: user.osiId } },
      select: { data: true, mimeType: true },
    })
    if (!media) return NextResponse.json({ error: "Не найдено" }, { status: 404 })

    return new NextResponse(new Uint8Array(media.data), {
      headers: {
        "Content-Type": media.mimeType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    })
  } catch (error) {
    console.error("Ошибка выдачи фото:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
