"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Props {
  requestId: string
  userId: string | null
  status: string
}

// Кнопки оператора: одобрить / отклонить / выдать новую ссылку.
// Ссылка-приглашение показывается один раз; оператор отправляет её председателю вручную.
export default function RequestActions({ requestId, userId, status }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")
  const [invite, setInvite] = useState<{ url: string; expiresAt: string } | null>(null)

  async function call(url: string, body?: unknown) {
    setBusy(true)
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? "Операция не выполнена")
        return null
      }
      return data
    } catch {
      toast.error("Нет связи с сервером")
      return null
    } finally {
      setBusy(false)
    }
  }

  async function approve() {
    const data = await call(`/api/admin/requests/${requestId}/approve`)
    if (data?.inviteUrl) {
      setInvite({ url: data.inviteUrl, expiresAt: data.expiresAt })
      router.refresh()
    }
  }

  async function reject() {
    const data = await call(`/api/admin/requests/${requestId}/reject`, { reason })
    if (data) {
      toast.success("Заявка отклонена")
      setRejecting(false)
      router.refresh()
    }
  }

  async function newLink() {
    if (!userId) return
    const data = await call(`/api/admin/users/${userId}/invite`)
    if (data?.inviteUrl) setInvite({ url: data.inviteUrl, expiresAt: data.expiresAt })
  }

  async function copy() {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.url)
      toast.success("Ссылка скопирована")
    } catch {
      toast.error("Не удалось скопировать, выделите ссылку вручную")
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === "PENDING" && !rejecting && (
          <>
            <Button size="sm" onClick={approve} disabled={busy}>
              Одобрить
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRejecting(true)} disabled={busy}>
              Отклонить
            </Button>
          </>
        )}
        {status === "PENDING" && rejecting && (
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Причина (необязательно)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
            />
            <Button size="sm" variant="destructive" onClick={reject} disabled={busy}>
              Подтвердить отказ
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRejecting(false)} disabled={busy}>
              Отмена
            </Button>
          </div>
        )}
        {status === "APPROVED" && userId && (
          <Button size="sm" variant="outline" onClick={newLink} disabled={busy}>
            Новая ссылка для пароля
          </Button>
        )}
      </div>

      <Dialog open={!!invite} onOpenChange={(open) => !open && setInvite(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ссылка для установки пароля</DialogTitle>
            <DialogDescription>
              Отправьте её председателю (WhatsApp, Telegram). Ссылка одноразовая и показывается только сейчас;
              действует до {invite ? new Date(invite.expiresAt).toLocaleString("ru-RU") : ""}.
            </DialogDescription>
          </DialogHeader>
          <Input readOnly value={invite?.url ?? ""} onFocus={(e) => e.target.select()} />
          <Button onClick={copy}>Скопировать ссылку</Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
