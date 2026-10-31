"use client"

import Link from "next/link"
import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function EmailLoginConfirm() {
  const router = useRouter()
  const token = useSearchParams().get("token") ?? ""
  const [loading, setLoading] = useState(false)

  async function confirm() {
    setLoading(true)
    try {
      const res = await fetch("/api/auth/email-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
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

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Ссылка недействительна</CardTitle>
          <CardDescription>Запросите новую ссылку на странице входа.</CardDescription>
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
        <CardTitle>Вход в кабинет</CardTitle>
        <CardDescription>Нажмите кнопку, чтобы войти. Ссылка одноразовая.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={confirm} disabled={loading}>
          {loading ? "Входим…" : "Войти"}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function EmailLoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Suspense fallback={null}>
        <EmailLoginConfirm />
      </Suspense>
    </div>
  )
}
