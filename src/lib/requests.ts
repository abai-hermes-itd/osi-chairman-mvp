// Проверки и хелперы для заявок жильцов и фото (без внешних библиотек)
import type { ParseResult } from "@/lib/validation"

export const CATEGORIES = ["LEAK", "ELEVATOR", "LIGHTING", "GARBAGE", "OTHER"] as const
export const URGENCIES = ["LOW", "NORMAL", "HIGH"] as const
export const STATUSES = ["NEW", "IN_PROGRESS", "DONE", "CANCELLED"] as const
export const MEDIA_KINDS = ["BEFORE", "AFTER"] as const

export const CATEGORY_LABEL: Record<string, string> = {
  LEAK: "Протечка",
  ELEVATOR: "Лифт",
  LIGHTING: "Освещение",
  GARBAGE: "Мусор",
  OTHER: "Другое",
}
export const URGENCY_LABEL: Record<string, string> = { LOW: "Низкая", NORMAL: "Обычная", HIGH: "Срочно" }
export const STATUS_LABEL: Record<string, string> = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  DONE: "Выполнена",
  CANCELLED: "Отменена",
}

// Лимиты. На Vercel тело запроса не больше ~4,5 МБ, поэтому фото сжимаются на клиенте.
export const MAX_PHOTOS_PER_REQUEST = 5
export const MAX_PHOTO_BYTES = 900 * 1024
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024

type Pick<T extends readonly string[]> = T[number]

function oneOf<T extends readonly string[]>(value: unknown, list: T, fallback: Pick<T>): Pick<T> | null {
  if (value === undefined || value === null || value === "") return fallback
  return typeof value === "string" && (list as readonly string[]).includes(value) ? (value as Pick<T>) : null
}

function text(value: unknown, max: number): string | null | undefined {
  // undefined = некорректно, null = пусто, string = значение
  if (value === undefined || value === null || value === "") return null
  if (typeof value !== "string") return undefined
  const v = value.trim()
  if (v.length === 0) return null
  return v.length <= max ? v : undefined
}

export interface RequestInput {
  residentName: string | null
  apartment: string | null
  entrance: string | null
  category: Pick<typeof CATEGORIES>
  urgency: Pick<typeof URGENCIES>
  description: string
}

export function parseRequestFields(get: (key: string) => unknown): ParseResult<RequestInput> {
  const description = text(get("description"), 2000)
  if (!description) return { ok: false, error: "Опишите проблему (до 2000 символов)" }

  const residentName = text(get("residentName"), 150)
  const apartment = text(get("apartment"), 20)
  const entrance = text(get("entrance"), 20)
  if (residentName === undefined || apartment === undefined || entrance === undefined) {
    return { ok: false, error: "Одно из полей слишком длинное или некорректное" }
  }

  const category = oneOf(get("category"), CATEGORIES, "OTHER")
  const urgency = oneOf(get("urgency"), URGENCIES, "NORMAL")
  if (!category) return { ok: false, error: "Неизвестная категория" }
  if (!urgency) return { ok: false, error: "Неизвестная срочность" }

  return { ok: true, data: { residentName, apartment, entrance, category, urgency, description } }
}

export function isStatus(value: unknown): value is Pick<typeof STATUSES> {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value)
}

export function isMediaKind(value: unknown): value is Pick<typeof MEDIA_KINDS> {
  return typeof value === "string" && (MEDIA_KINDS as readonly string[]).includes(value)
}

// Тип файла определяем по содержимому, а не по заявленному клиентом
export function sniffImageType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp"
  return null
}

export interface ValidPhoto {
  bytes: Uint8Array
  mimeType: "image/jpeg" | "image/png" | "image/webp"
}

// Проверка набора файлов из формы; возвращает готовые к записи фото или текст ошибки
export async function readPhotos(files: unknown[]): Promise<ParseResult<ValidPhoto[]>> {
  const list = files.filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f && (f as File).size > 0)
  if (list.length > MAX_PHOTOS_PER_REQUEST) {
    return { ok: false, error: `Не больше ${MAX_PHOTOS_PER_REQUEST} фото` }
  }
  let total = 0
  const out: ValidPhoto[] = []
  for (const file of list) {
    if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: "Фото слишком большое. Допустимо до 900 КБ после сжатия" }
    total += file.size
    if (total > MAX_TOTAL_BYTES) return { ok: false, error: "Суммарный размер фото слишком большой" }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const mimeType = sniffImageType(bytes)
    if (!mimeType) return { ok: false, error: "Допустимы только фото JPEG, PNG или WebP" }
    out.push({ bytes, mimeType })
  }
  return { ok: true, data: out }
}
