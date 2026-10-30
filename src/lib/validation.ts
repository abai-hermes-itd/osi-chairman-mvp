// Проверка входных данных (без внешних библиотек)

export interface RegistrationInput {
  name: string
  email: string
  phone: string
  osiBin: string
  osiName: string | null
  city: string | null
  address: string | null
  basis: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// БИН в Казахстане: ровно 12 цифр
export function isValidBin(bin: string): boolean {
  return /^\d{12}$/.test(bin)
}

function str(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const v = value.trim()
  return v.length > 0 && v.length <= max ? v : null
}

function optional(value: unknown, max: number): { ok: boolean; value: string | null } {
  if (value === undefined || value === null || value === "") return { ok: true, value: null }
  const v = str(value, max)
  return v === null ? { ok: false, value: null } : { ok: true, value: v }
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string }

export function parseRegistration(body: unknown): ParseResult<RegistrationInput> {
  if (!body || typeof body !== "object") return { ok: false, error: "Некорректные данные" }
  const b = body as Record<string, unknown>

  const name = str(b.name, 150)
  if (!name || name.length < 5) return { ok: false, error: "Укажите ФИО полностью" }

  const email = str(b.email, 200)?.toLowerCase()
  if (!email || !EMAIL_RE.test(email)) return { ok: false, error: "Укажите корректный email" }

  const phoneRaw = str(b.phone, 30)
  const phone = phoneRaw?.replace(/[^\d+]/g, "")
  if (!phone || phone.replace(/\D/g, "").length < 10 || phone.replace(/\D/g, "").length > 15) {
    return { ok: false, error: "Укажите корректный телефон" }
  }

  const osiBin = typeof b.osiBin === "string" ? b.osiBin.replace(/\s/g, "") : ""
  if (!isValidBin(osiBin)) return { ok: false, error: "БИН ОСИ должен состоять из 12 цифр" }

  const osiName = optional(b.osiName, 200)
  const city = optional(b.city, 100)
  const address = optional(b.address, 300)
  const basis = optional(b.basis, 1000)
  if (!osiName.ok || !city.ok || !address.ok || !basis.ok) {
    return { ok: false, error: "Одно из полей слишком длинное или некорректное" }
  }

  return {
    ok: true,
    data: {
      name,
      email,
      phone,
      osiBin,
      osiName: osiName.value,
      city: city.value,
      address: address.value,
      basis: basis.value,
    },
  }
}

// Правила пароля: минимум 10 символов, не только цифры, не равен email
export function validatePassword(password: unknown, email?: string | null): string | null {
  if (typeof password !== "string") return "Введите пароль"
  if (password.length < 10) return "Пароль должен быть не короче 10 символов"
  if (password.length > 200) return "Пароль слишком длинный"
  if (/^\d+$/.test(password)) return "Пароль не должен состоять только из цифр"
  if (email && password.toLowerCase() === email.toLowerCase()) {
    return "Пароль не должен совпадать с email"
  }
  return null
}
