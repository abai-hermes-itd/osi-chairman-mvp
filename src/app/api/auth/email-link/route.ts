import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendMail } from "@/lib/mailer"
import { appOrigin, issueLoginLink, loginMail, normalizeEmail } from "@/lib/emailLogin"

export const dynamic = "force-dynamic"

// Ответ всегда один и тот же: по нему нельзя узнать, есть ли такой email в системе
const GENERIC = { success: true, message: "Если такой адрес есть в системе, мы отправили на него ссылку для входа." }

// Запрос ссылки для входа на email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const email = normalizeEmail(body?.email)
    if (!email) return NextResponse.json(GENERIC)

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (!user) return NextResponse.json(GENERIC)

    const origin = appOrigin(request)
    if (!origin) {
      console.error("APP_URL не задан: ссылка для входа не отправлена")
      return NextResponse.json(GENERIC)
    }

    const url = await issueLoginLink(user.id, origin)
    if (url) {
      const { subject, text } = loginMail(url)
      await sendMail({ to: email, subject, text })
    }
    return NextResponse.json(GENERIC)
  } catch (error) {
    console.error("Ошибка выдачи ссылки для входа:", error)
    return NextResponse.json(GENERIC)
  }
}
