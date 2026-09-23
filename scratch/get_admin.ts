import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const db = new PrismaClient()

async function main() {
  let admin = await db.user.findFirst({
    where: { platformRole: "SUPER_ADMIN" }
  })
  
  if (!admin) {
    console.log("No SUPER_ADMIN found. Creating one...")
    const passwordHash = await bcrypt.hash("admin123", 10)
    admin = await db.user.create({
      data: {
        email: "admin@citc.biz",
        name: "Super Admin",
        username: "superadmin",
        passwordHash,
        platformRole: "SUPER_ADMIN",
        status: "ACTIVE",
        onboardingStep: "COMPLETED"
      }
    })
    console.log("Created: admin@citc.biz / admin123")
  } else {
    console.log("Found admin: " + admin.email)
    // We can't reverse the hash, so let's reset it to a known one just in case so the user can log in.
    const passwordHash = await bcrypt.hash("admin123", 10)
    await db.user.update({
      where: { id: admin.id },
      data: { passwordHash }
    })
    console.log("Password reset to: admin123")
  }
}

main().catch(console.error).finally(() => db.$disconnect())
