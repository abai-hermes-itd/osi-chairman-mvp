import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"
import { randomBytes } from "crypto"

const prisma = new PrismaClient()

// SEED_ADMIN_EMAIL    : email пользователя (обязательно)
// SEED_ADMIN_PASSWORD : пароль; если не задан, будет сгенерирован и показан ОДИН раз в консоли
// SEED_ROLE           : CHAIRMAN (по умолчанию) или ADMIN (оператор, без привязки к ОСИ)
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const role = process.env.SEED_ROLE ?? "CHAIRMAN"

  if (!email) {
    throw new Error("Задайте SEED_ADMIN_EMAIL в окружении (.env не коммитится).")
  }
  if (role !== "CHAIRMAN" && role !== "ADMIN") {
    throw new Error("SEED_ROLE должен быть CHAIRMAN или ADMIN")
  }

  const generated = !process.env.SEED_ADMIN_PASSWORD
  const password = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(18).toString("base64url")
  const passwordHash = await hash(password, 12)

  let osiId: string | null = null
  if (role === "CHAIRMAN") {
    // Пустой «стерильный» дом: настраивается позже через /api/config
    const osi = await prisma.osi.upsert({
      where: { bin: "temp" },
      update: {},
      create: { bin: "temp", status: "PENDING_SETUP" },
    })
    osiId = osi.id
  }

  // При повторном запуске меняется только пароль; роль и ОСИ существующего пользователя не трогаем
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      passwordHash,
      name: role === "ADMIN" ? "Оператор" : "Председатель",
      role,
      osiId,
    },
  })

  console.log(`Seed OK: пользователь ${email}, роль ${role}${osiId ? `, ОСИ ${osiId}` : ""}`)
  if (generated) {
    console.log("")
    console.log("Сгенерированный пароль (показан один раз, сохраните в менеджер паролей, на скриншот не снимать):")
    console.log(password)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
