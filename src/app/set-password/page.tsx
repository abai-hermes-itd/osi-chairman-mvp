"use client"

import Link from "next/link"
import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function SetPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error("Пароли не совпадают")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? "Не удалось задать пароль")
        return
      }
      toast.success("Пароль задан. Теперь можно войти.")
      router.replace("/login")
    } catch {
      toast.error("Нет связи с сервером")
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Ссылка недействительна</CardTitle>
          <CardDescription>Попросите оператора выдать новую ссылку для установки пароля.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="text-sm underline">
            Ко входу
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Задайте пароль</CardTitle>
        <CardDescription>Минимум 10 символов, не только цифры. Сохраните его в менеджере паролей.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Новый пароль</Label>
            <Input id="password" type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Повторите пароль</Label>
            <Input id="confirm" type="password" autoComplete="new-password" required minLength={10} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Сохраняем…" : "Сохранить пароль"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Suspense fallback={null}>
        <SetPasswordForm />
      </Suspense>
    </div>
  )
}
