import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireOsiUser } from "@/lib/auth"
import RequestCardActions from "@/components/RequestCardActions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CATEGORY_LABEL, STATUS_LABEL, URGENCY_LABEL } from "@/lib/requests"

export const dynamic = "force-dynamic"

export default async function RequestCardPage({ params }: { params: { id: string } }) {
  const user = await requireOsiUser()
  if (!user) redirect("/")

  const r = await prisma.residentRequest.findFirst({
    where: { id: params.id, osiId: user.osiId },
    include: { media: { select: { id: true, kind: true }, orderBy: { createdAt: "asc" } } },
  })
  if (!r) notFound()

  const before = r.media.filter((m: any) => m.kind === "BEFORE")
  const after = r.media.filter((m: any) => m.kind === "AFTER")

  const gallery = (title: string, items: any[]) =>
    items.length > 0 && (
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="flex flex-wrap gap-2">
          {items.map((m) => (
            <a key={m.id} href={`/api/media/${m.id}`} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/media/${m.id}`} alt="" className="h-32 w-32 rounded-md object-cover border" />
            </a>
          ))}
        </div>
      </div>
    )

  const row = (label: string, value: string | null) =>
    value ? (
      <div className="grid grid-cols-[8rem_1fr] gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span>{value}</span>
      </div>
    ) : null

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-4">
        <Link href="/requests" className="text-sm underline">← К списку заявок</Link>
        <Card>
          <CardHeader>
            <CardTitle>
              {CATEGORY_LABEL[r.category] ?? r.category} · {STATUS_LABEL[r.status] ?? r.status}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap">{r.description}</p>
            <div className="space-y-1">
              {row("Срочность", URGENCY_LABEL[r.urgency] ?? r.urgency)}
              {row("Жилец", r.residentName)}
              {row("Подъезд", r.entrance)}
              {row("Квартира", r.apartment)}
              {row("Принята", new Date(r.createdAt).toLocaleString("ru-RU"))}
            </div>
            {gallery("Фото до", before)}
            {gallery("Фото после", after)}
            <RequestCardActions id={r.id} status={r.status} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
