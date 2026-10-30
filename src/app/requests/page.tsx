import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireOsiUser } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CATEGORY_LABEL, STATUSES, STATUS_LABEL, URGENCY_LABEL, isStatus } from "@/lib/requests"

export const dynamic = "force-dynamic"

export default async function RequestsListPage({ searchParams }: { searchParams: { status?: string } }) {
  const user = await requireOsiUser()
  if (!user) redirect("/")

  const status = isStatus(searchParams.status) ? searchParams.status : undefined
  const items = await prisma.residentRequest.findMany({
    where: { osiId: user.osiId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { media: { select: { id: true, kind: true }, orderBy: { createdAt: "asc" }, take: 1 } },
  })

  const tab = (value: string | undefined, label: string) => (
    <Link
      key={label}
      href={value ? `/requests?status=${value}` : "/requests"}
      className={`rounded-full border px-3 py-1 text-sm ${status === value ? "bg-primary text-primary-foreground" : ""}`}
    >
      {label}
    </Link>
  )

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Заявки жильцов</h1>
          <Link href="/" className="text-sm underline">На главную</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {tab(undefined, "Все")}
          {STATUSES.map((s) => tab(s, STATUS_LABEL[s]))}
        </div>
        <Button asChild>
          <Link href="/requests/new">Принять заявку</Link>
        </Button>
        {items.length === 0 && <p className="text-sm text-muted-foreground">Заявок пока нет.</p>}
        {items.map((r: any) => (
          <Link key={r.id} href={`/requests/${r.id}`} className="block">
            <Card>
              <CardContent className="flex gap-3 p-4">
                {r.media[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/media/${r.media[0].id}`} alt="" className="h-16 w-16 rounded-md object-cover border shrink-0" />
                )}
                <div className="min-w-0 space-y-1">
                  <div className="text-sm text-muted-foreground">
                    {CATEGORY_LABEL[r.category] ?? r.category} · {URGENCY_LABEL[r.urgency] ?? r.urgency} ·{" "}
                    {STATUS_LABEL[r.status] ?? r.status}
                  </div>
                  <div className="line-clamp-2">{r.description}</div>
                  <div className="text-xs text-muted-foreground">
                    {[r.entrance && `подъезд ${r.entrance}`, r.apartment && `кв. ${r.apartment}`, r.residentName]
                      .filter(Boolean)
                      .join(" · ")}
                    {" · "}
                    {new Date(r.createdAt).toLocaleString("ru-RU")}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </main>
    </div>
  )
}
