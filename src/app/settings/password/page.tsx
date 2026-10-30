"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirm) {
      toast.error("Новые пароли не совпадают")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? "Не удалось сменить пароль")
        return
      }
      toast.success("Пароль изменён")
      setCurrentPassword("")
      setNewPassword("")
      setConfirm("")
    } catch {
      toast.error("Нет связи с сервером")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Смена пароля</CardTitle>
          <CardDescription>Минимум 10 символов, не только цифры.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Текущий пароль</Label>
              <Input id="current" type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">Новый пароль</Label>
              <Input id="new" type="password" autoComplete="new-password" required minLength={10} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Повторите новый пароль</Label>
              <Input id="confirm" type="password" autoComplete="new-password" required minLength={10} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Сохраняем…" : "Сменить пароль"}
            </Button>
            <Link href="/" className="block text-center text-sm underline">
              На главную
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
