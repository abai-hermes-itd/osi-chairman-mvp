"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CATEGORY_LABEL, MAX_PHOTOS_PER_REQUEST, URGENCY_LABEL } from "@/lib/requests"
import { shrinkImage } from "@/lib/imageResize"

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export default function NewRequestPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    residentName: "",
    apartment: "",
    entrance: "",
    category: "OTHER",
    urgency: "NORMAL",
    description: "",
  })
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (picked.length === 0) return
    if (photos.length + picked.length > MAX_PHOTOS_PER_REQUEST) {
      toast.error(`Не больше ${MAX_PHOTOS_PER_REQUEST} фото`)
      return
    }
    try {
      const shrunk = await Promise.all(picked.map((f) => shrinkImage(f)))
      setPhotos((p) => [...p, ...shrunk])
      setPreviews((p) => [...p, ...shrunk.map((f) => URL.createObjectURL(f))])
    } catch {
      toast.error("Не удалось обработать фото. Попробуйте другое.")
    }
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(previews[index])
    setPhotos((p) => p.filter((_, i) => i !== index))
    setPreviews((p) => p.filter((_, i) => i !== index))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const body = new FormData()
      for (const [key, value] of Object.entries(form)) body.append(key, value)
      photos.forEach((f) => body.append("photos", f))
      const res = await fetch("/api/requests", { method: "POST", body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? "Не удалось сохранить заявку")
        return
      }
      toast.success("Заявка принята")
      router.push(`/requests/${data.item.id}`)
    } catch {
      toast.error("Нет связи с сервером")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Принять заявку жильца</CardTitle>
          <CardDescription>Опишите проблему и приложите фото, если они есть.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="residentName">Жилец (необязательно)</Label>
              <Input id="residentName" maxLength={150} value={form.residentName} onChange={set("residentName")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="entrance">Подъезд</Label>
                <Input id="entrance" maxLength={20} value={form.entrance} onChange={set("entrance")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apartment">Квартира</Label>
                <Input id="apartment" maxLength={20} value={form.apartment} onChange={set("apartment")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="category">Категория</Label>
                <select id="category" className={selectClass} value={form.category} onChange={set("category")}>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="urgency">Срочность</Label>
                <select id="urgency" className={selectClass} value={form.urgency} onChange={set("urgency")}>
                  {Object.entries(URGENCY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Что случилось *</Label>
              <textarea
                id="description"
                rows={4}
                required
                maxLength={2000}
                value={form.description}
                onChange={set("description")}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photos">Фото (до {MAX_PHOTOS_PER_REQUEST})</Label>
              <Input id="photos" type="file" accept="image/*" multiple onChange={onPick} />
              {previews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {previews.map((src, i) => (
                    <div key={src} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-20 w-20 rounded-md object-cover border" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border text-sm leading-none"
                        aria-label="Убрать фото"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Сохраняем…" : "Принять заявку"}
            </Button>
            <Link href="/requests" className="block text-center text-sm underline">
              К списку заявок
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
