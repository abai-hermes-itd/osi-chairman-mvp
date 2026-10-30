"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  osiBin: "",
  osiName: "",
  city: "",
  address: "",
  basis: "",
  website: "", // ловушка для ботов, скрыто от людей
}

export default function RegisterPage() {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? "Не удалось отправить заявку")
        return
      }
      setDone(true)
    } catch {
      toast.error("Нет связи с сервером")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Заявка принята</CardTitle>
            <CardDescription>
              Оператор проверит данные и свяжется с вами по указанному телефону или email.
              После одобрения вы получите ссылку, чтобы задать пароль.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login" className="text-sm underline">
              Вернуться ко входу
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Заявка на доступ</CardTitle>
          <CardDescription>
            Для председателей ОСИ. Мы проверим данные вручную, это занимает до нескольких рабочих дней.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">ФИО председателя</Label>
              <Input id="name" required value={form.name} onChange={set("name")} autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" type="tel" required value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="+7 ..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="osiBin">БИН ОСИ (12 цифр)</Label>
              <Input id="osiBin" required inputMode="numeric" maxLength={12} value={form.osiBin} onChange={set("osiBin")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="osiName">Название ОСИ</Label>
              <Input id="osiName" value={form.osiName} onChange={set("osiName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Город</Label>
              <Input id="city" value={form.city} onChange={set("city")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Адрес дома</Label>
              <Input id="address" value={form.address} onChange={set("address")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="basis">Основание полномочий</Label>
              <textarea
                id="basis"
                rows={3}
                value={form.basis}
                onChange={set("basis")}
                placeholder="Например: протокол общего собрания № 1 от 01.03.2024"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Ловушка для ботов: невидимое поле, люди его не заполняют */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="website">Сайт</label>
              <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Отправляем…" : "Отправить заявку"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Уже есть доступ?{" "}
              <Link href="/login" className="underline">
                Войти
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
