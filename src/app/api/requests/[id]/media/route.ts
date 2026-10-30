import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireOsiUser } from "@/lib/auth"
import { MAX_PHOTOS_PER_REQUEST, isMediaKind, readPhotos } from "@/lib/requests"

export const dynamic = "force-dynamic"

// Добавить фото к заявке (например, «после» выполнения работ)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireOsiUser()
    if (!user) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })

    const existing = await prisma.residentRequest.findFirst({
      where: { id: params.id, osiId: user.osiId },
      select: { id: true },
    })
    if (!existing) return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 })

    const form = await request.formData().catch(() => null)
    if (!form) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 })

    const kind = form.get("kind") ?? "AFTER"
    if (!isMediaKind(kind)) return NextResponse.json({ error: "Неизвестный тип фото" }, { status: 400 })

    const photos = await readPhotos(form.getAll("photos"))
    if (!photos.ok) return NextResponse.json({ error: photos.error }, { status: 400 })
    if (photos.data.length === 0) return NextResponse.json({ error: "Прикрепите фото" }, { status: 400 })

    const count = await prisma.requestMedia.count({ where: { requestId: params.id } })
    if (count + photos.data.length > MAX_PHOTOS_PER_REQUEST * 2) {
      return NextResponse.json({ error: "Слишком много фото в заявке" }, { status: 400 })
    }

    await prisma.requestMedia.createMany({
      data: photos.data.map((p) => ({
        requestId: params.id,
        kind,
        mimeType: p.mimeType,
        size: p.bytes.length,
        data: Buffer.from(p.bytes),
      })),
    })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("Ошибка добавления фото:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
