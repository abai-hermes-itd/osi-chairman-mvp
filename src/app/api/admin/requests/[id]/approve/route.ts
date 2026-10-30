import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { createInviteLink } from "@/lib/invite"

export const dynamic = "force-dynamic"

// Оператор одобряет заявку: создаётся ОСИ (если нет) и председатель без пароля,
// выдаётся одноразовая ссылка «задать пароль». Ссылку оператор отправляет вручную.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })

    const req = await prisma.registrationRequest.findUnique({ where: { id: params.id } })
    if (!req) return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 })
    if (req.status !== "PENDING") {
      return NextResponse.json({ error: "Заявка уже обработана" }, { status: 409 })
    }

    const emailTaken = await prisma.user.findUnique({
      where: { email: req.email },
      select: { id: true },
    })
    if (emailTaken) {
      return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 409 })
    }

    const existingOsi = await prisma.osi.findUnique({
      where: { bin: req.osiBin },
      include: { users: { where: { role: "CHAIRMAN" }, select: { id: true } } },
    })
    if (existingOsi && existingOsi.users.length > 0) {
      return NextResponse.json(
        { error: "У ОСИ с этим БИН уже есть председатель" },
        { status: 409 }
      )
    }

    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const osi =
        existingOsi ??
        (await tx.osi.create({
          data: {
            bin: req.osiBin,
            name: req.osiName,
            city: req.city,
            address: req.address,
            status: "PENDING_SETUP",
          },
        }))

      const created = await tx.user.create({
        data: {
          email: req.email,
          name: req.name,
          role: "CHAIRMAN",
          osiId: osi.id,
        },
      })

      await tx.registrationRequest.update({
        where: { id: req.id },
        data: {
          status: "APPROVED",
          reviewedById: admin.id,
          reviewedAt: new Date(),
          userId: created.id,
        },
      })
      return created
    })

    const invite = await createInviteLink(user.id, new URL(request.url).origin)
    return NextResponse.json({ success: true, inviteUrl: invite.url, expiresAt: invite.expiresAt })
  } catch (error) {
    console.error("Ошибка одобрения заявки:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
