"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { shrinkImage } from "@/lib/imageResize"
import { STATUS_LABEL } from "@/lib/requests"

// Кнопки смены статуса и загрузка фото «после»
export default function RequestCardActions({ id, status }: { id: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function setStatus(next: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? "Не удалось сменить статус")
        return
      }
      toast.success(`Статус: ${STATUS_LABEL[next]}`)
      router.refresh()
    } catch {
      toast.error("Нет связи с сервером")
    } finally {
      setBusy(false)
    }
  }

  async function addAfter(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (picked.length === 0) return
    setBusy(true)
    try {
      const body = new FormData()
      body.append("kind", "AFTER")
      for (const f of picked) body.append("photos", await shrinkImage(f))
      const res = await fetch(`/api/requests/${id}/media`, { method: "POST", body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? "Не удалось добавить фото")
        return
      }
      toast.success("Фото добавлено")
      router.refresh()
    } catch {
      toast.error("Не удалось обработать фото")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {status !== "IN_PROGRESS" && status !== "DONE" && status !== "CANCELLED" && (
          <Button disabled={busy} onClick={() => setStatus("IN_PROGRESS")}>В работу</Button>
        )}
        {status !== "DONE" && status !== "CANCELLED" && (
          <Button disabled={busy} variant="outline" onClick={() => setStatus("DONE")}>Выполнена</Button>
        )}
        {status !== "CANCELLED" && status !== "DONE" && (
          <Button disabled={busy} variant="outline" onClick={() => setStatus("CANCELLED")}>Отменить</Button>
        )}
        {(status === "DONE" || status === "CANCELLED") && (
          <Button disabled={busy} variant="outline" onClick={() => setStatus("NEW")}>Вернуть в «Новые»</Button>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="after">Добавить фото «после»</Label>
        <Input id="after" type="file" accept="image/*" multiple disabled={busy} onChange={addAfter} />
      </div>
    </div>
  )
}
