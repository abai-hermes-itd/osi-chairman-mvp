import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth"
import RequestActions from "@/components/RequestActions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Ожидает проверки",
  APPROVED: "Одобрена",
  REJECTED: "Отклонена",
}

export default async function RequestsPage() {
  const user = await getSessionUser()
  // Страница только для оператора (ADMIN)
  if (!user || user.role !== "ADMIN") redirect("/")

  const requests = await prisma.registrationRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  })
  // Ожидающие заявки сверху
  const sorted = [...requests].sort((a, b) => Number(b.status === "PENDING") - Number(a.status === "PENDING"))

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Заявки на доступ</h1>
          <Link href="/" className="text-sm underline">
            На главную
          </Link>
        </div>

        {sorted.length === 0 && <p className="text-muted-foreground">Заявок пока нет.</p>}

        {sorted.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {r.name} <span className="font-normal text-muted-foreground">· {STATUS_LABEL[r.status] ?? r.status}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">Email</dt>
                <dd>{r.email}</dd>
                <dt className="text-muted-foreground">Телефон</dt>
                <dd>{r.phone}</dd>
                <dt className="text-muted-foreground">БИН ОСИ</dt>
                <dd>{r.osiBin}</dd>
                {r.osiName && (
                  <>
                    <dt className="text-muted-foreground">ОСИ</dt>
                    <dd>{r.osiName}</dd>
                  </>
                )}
                {(r.city || r.address) && (
                  <>
                    <dt className="text-muted-foreground">Адрес</dt>
                    <dd>{[r.city, r.address].filter(Boolean).join(", ")}</dd>
                  </>
                )}
                {r.basis && (
                  <>
                    <dt className="text-muted-foreground">Основание</dt>
                    <dd className="whitespace-pre-wrap">{r.basis}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Подана</dt>
                <dd>{r.createdAt.toLocaleString("ru-RU")}</dd>
                {r.rejectReason && (
                  <>
                    <dt className="text-muted-foreground">Причина отказа</dt>
                    <dd>{r.rejectReason}</dd>
                  </>
                )}
              </dl>
              <RequestActions requestId={r.id} userId={r.userId} status={r.status} />
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  )
}
