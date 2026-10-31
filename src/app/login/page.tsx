"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [usePassword, setUsePassword] = useState(false)
  const [sent, setSent] = useState(false)

  // Основной способ: ссылка для входа на email
  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/auth/email-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        toast.error("Не удалось отправить ссылку")
        return
      }
      setSent(true)
    } catch {
      toast.error("Нет связи с сервером")
    } finally {
      setLoading(false)
    }
  }

  // Запасной способ: пароль
  async function loginWithPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? "Не удалось войти")
        return
      }
      router.replace("/")
      router.refresh()
    } catch {
      toast.error("Нет связи с сервером")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Проверьте почту</CardTitle>
            <CardDescription>
              Если адрес {email} есть в системе, мы отправили на него ссылку для входа. Она действует 15 минут.
              Проверьте также папку «Спам».
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
              Отправить ещё раз
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Кабинет председателя ОСИ</CardTitle>
          <CardDescription>
            {usePassword ? "Войдите по паролю" : "Мы отправим ссылку для входа на ваш email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={usePassword ? loginWithPassword : sendLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {usePassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {usePassword
                ? loading ? "Входим…" : "Войти"
                : loading ? "Отправляем…" : "Получить ссылку для входа"}
            </Button>
            <button
              type="button"
              className="block w-full text-center text-sm text-muted-foreground underline"
              onClick={() => setUsePassword((v) => !v)}
            >
              {usePassword ? "Войти по ссылке из email" : "Войти по паролю"}
            </button>
            <p className="text-center text-sm text-muted-foreground">
              Нет доступа?{" "}
              <Link href="/register" className="underline">
                Подать заявку
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
