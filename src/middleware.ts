import { NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session"
import { devBypass } from "@/lib/devBypass"

// Открыто без входа: вход, подача заявки, установка пароля по ссылке
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/set-password",
  "/api/auth/login",
  "/api/auth/set-password",
  "/api/register",
]

export async function middleware(request: NextRequest) {
  // Локальная разработка с DEV_AUTH_BYPASS=1: вход не требуется
  if (devBypass()) return NextResponse.next()

  const { pathname } = request.nextUrl
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)

  if (PUBLIC_PATHS.includes(pathname)) {
    // Уже вошедшего с /login отправляем на главную
    if (session && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Всё, кроме статики Next и публичных файлов приложения
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|screenshots/|manifest.webmanifest).*)",
  ],
}
