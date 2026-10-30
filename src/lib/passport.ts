import path from "path"
import matter from "gray-matter"
import { prisma } from "@/lib/prisma"

// Паспорт МКД в формате, который ждёт интерфейс (snake_case, как в house.md)
export interface Passport {
  management_type: string
  name: string
  city: string
  address: string
  total_flats: number
  status: string
}

// Шаблон по умолчанию: data/config/house.md (только чтение, в git)
function readTemplate(): Passport {
  const file = matter.read(path.join(process.cwd(), "data/config/house.md"))
  const d = file.data as Partial<Passport>
  return {
    management_type: d.management_type ?? "",
    name: d.name ?? "",
    city: d.city ?? "",
    address: d.address ?? "",
    total_flats: d.total_flats ?? 0,
    status: d.status ?? "PENDING_SETUP",
  }
}

// Источник правды теперь БД (таблица Osi): на Vercel файловая система только для чтения
export async function getPassport(osiId: string | null): Promise<Passport> {
  const template = readTemplate()
  if (!osiId) return template

  const osi = await prisma.osi.findUnique({ where: { id: osiId } })
  if (!osi) return template

  return {
    management_type: osi.managementType ?? template.management_type,
    name: osi.name ?? template.name,
    city: osi.city ?? template.city,
    address: osi.address ?? template.address,
    total_flats: osi.totalFlats ?? template.total_flats,
    status: osi.status,
  }
}

const MANAGEMENT_TYPES = ["OSI", "KSK", "PT"]

// Разбор и проверка тела запроса; возвращает данные для Prisma или текст ошибки
export function parsePassportInput(
  body: unknown
): { data: Record<string, string | number>; error?: undefined } | { error: string; data?: undefined } {
  if (!body || typeof body !== "object") return { error: "Некорректные данные" }
  const b = body as Record<string, unknown>
  const data: Record<string, string | number> = {}

  const str = (key: string, field: string, max: number) => {
    if (b[key] === undefined) return null
    if (typeof b[key] !== "string" || (b[key] as string).trim().length > max) {
      return `Поле «${key}» некорректно`
    }
    data[field] = (b[key] as string).trim()
    return null
  }

  const errors = [
    str("name", "name", 200),
    str("city", "city", 100),
    str("address", "address", 300),
  ].filter(Boolean)
  if (errors.length) return { error: errors[0] as string }

  if (b.management_type !== undefined) {
    if (typeof b.management_type !== "string" || !MANAGEMENT_TYPES.includes(b.management_type)) {
      return { error: "Поле «management_type» должно быть OSI, KSK или PT" }
    }
    data.managementType = b.management_type
  }

  if (b.total_flats !== undefined) {
    const n = Number(b.total_flats)
    if (!Number.isInteger(n) || n < 0 || n > 10000) {
      return { error: "Поле «total_flats» должно быть целым числом от 0 до 10000" }
    }
    data.totalFlats = n
  }

  if (Object.keys(data).length === 0) return { error: "Нет данных для сохранения" }
  return { data }
}
