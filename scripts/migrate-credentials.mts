import { PrismaClient } from "@prisma/client"
import { encrypt, decrypt } from "../src/lib/crypto"

const db = new PrismaClient()

async function main() {
  const sensitiveKeys = [
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "AUTH_GOOGLE_SECRET",
    "SMTP_PASS"
  ]

  for (const key of sensitiveKeys) {
    const setting = await db.globalSetting.findUnique({ where: { key } })
    if (setting && setting.value) {
      // Check if already encrypted
      if (!setting.value.includes(":")) {
        console.log(`Encrypting ${key}...`)
        const encrypted = encrypt(setting.value)
        await db.globalSetting.update({
          where: { key },
          data: { value: encrypted }
        })
      } else {
        console.log(`${key} is already encrypted or empty.`)
      }
    }
  }
  
  console.log("Migration complete.")
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
