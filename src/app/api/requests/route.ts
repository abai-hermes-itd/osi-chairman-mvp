import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireOsiUser } from "@/lib/auth"
import { isStatus, parseRequestFields, readPhotos } from "@/lib/requests"

export const dynamic = "force-dynamic"

const MEDIA_META = { select: { id: true, kind: true, mimeType: true, size: true }, orderBy: { createdAt: "asc" as const } }

// Список заявок своей ОСИ (без самих фото)
export async function GET(request: NextRequest) {
  try {
    const user = await requireOsiUser()
    if (!user) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })

    const status = request.nextUrl.searchParams.get("status")
    if (status && !isStatus(status)) return NextResponse.json({ error: "Неизвестный статус" }, { status: 400 })

    const items = await prisma.residentRequest.findMany({
      where: { osiId: user.osiId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { media: MEDIA_META },
    })
    return NextResponse.json({ items })
  } catch (error) {
    console.error("Ошибка списка заявок:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}

// Принять заявку жильца: поля формы и до 5 фото (multipart/form-data)
export async function POST(request: NextRequest) {
  try {
    const user = await requireOsiUser()
    if (!user) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })

    const form = await request.formData().catch(() => null)
    if (!form) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 })

    const fields = parseRequestFields((key) => form.get(key) ?? undefined)
    if (!fields.ok) return NextResponse.json({ error: fields.error }, { status: 400 })

    const photos = await readPhotos(form.getAll("photos"))
    if (!photos.ok) return NextResponse.json({ error: photos.error }, { status: 400 })

    const created = await prisma.residentRequest.create({
      data: {
        osiId: user.osiId,
        createdById: user.id,
        ...fields.data,
        media: {
          create: photos.data.map((p) => ({
            kind: "BEFORE",
            mimeType: p.mimeType,
            size: p.bytes.length,
            data: Buffer.from(p.bytes),
          })),
        },
      },
      include: { media: MEDIA_META },
    })
    return NextResponse.json({ success: true, item: created }, { status: 201 })
  } catch (error) {
    console.error("Ошибка создания заявки:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
