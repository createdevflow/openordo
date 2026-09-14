import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const db = new PrismaClient()

async function main() {
  const email = "admin@citc.biz"
  const password = "12341234"
  const hash = await bcrypt.hash(password, 12)

  await db.user.upsert({
    where: { email },
    update: {
      passwordHash: hash,
      platformRole: "SUPER_ADMIN",
    },
    create: {
      email,
      username: "admin",
      name: "Super Admin",
      passwordHash: hash,
      platformRole: "SUPER_ADMIN",
      onboardingStep: "DONE",
    },
  })

  console.log("✅ Admin user upserted: admin@citc.biz / 12341234")
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
