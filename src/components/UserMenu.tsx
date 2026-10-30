import Link from "next/link"
import { getSessionUser } from "@/lib/auth"
import LogoutButton from "@/components/LogoutButton"

// Панель вверху главной: ссылки по роли + выход
export default async function UserMenu() {
  const user = await getSessionUser().catch(() => null)

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 mb-2 text-sm">
      {user?.role === "ADMIN" && (
        <Link href="/admin/requests" className="underline">
          Заявки на доступ
        </Link>
      )}
      {user?.osiId && (
        <Link href="/requests" className="underline">
          Заявки жильцов
        </Link>
      )}
      <Link href="/settings/password" className="underline">
        Сменить пароль
      </Link>
      <LogoutButton />
    </div>
  )
}
