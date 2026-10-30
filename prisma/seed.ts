import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error(
      "Задайте SEED_ADMIN_EMAIL и SEED_ADMIN_PASSWORD в окружении (.env не коммитится)."
    )
  }

  // Пустой «стерильный» дом: настраивается позже через /api/config
  const osi = await prisma.osi.upsert({
    where: { bin: "temp" },
    update: {},
    create: { bin: "temp", status: "PENDING_SETUP" },
  })

  const passwordHash = await hash(password, 12)

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      passwordHash,
      name: "Председатель",
      role: "CHAIRMAN",
      osiId: osi.id,
    },
  })

  console.log(`Seed OK: пользователь ${email}, ОСИ ${osi.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
