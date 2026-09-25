import { PrismaClient } from "@prisma/client"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const db = new PrismaClient()

async function main() {
  const dataPath = path.join(process.cwd(), "prisma", "seed-data.json")
  if (!fs.existsSync(dataPath)) {
    console.log("No seed-data.json found. Run db-export first.")
    return
  }
  
  console.log("Importing configuration data...")
  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"))

  // Upsert Features
  if (data.features) {
    for (const f of data.features) {
      const { id, createdAt, updatedAt, ...rest } = f
      await db.feature.upsert({ where: { key: f.key }, update: rest, create: { ...rest, id } })
    }
  }

  // Upsert Plans
  if (data.plans) {
    for (const p of data.plans) {
      const { id, createdAt, updatedAt, ...rest } = p
      await db.plan.upsert({ where: { id: p.id }, update: rest, create: { ...rest, id } })
    }
  }

  // Upsert PlanFeatures
  if (data.planFeatures) {
    for (const pf of data.planFeatures) {
      const { createdAt, updatedAt, ...rest } = pf
      await db.planFeature.upsert({
        where: { planId_featureId: { planId: pf.planId, featureId: pf.featureId } },
        update: rest,
        create: rest
      })
    }
  }

  // Upsert Plugins
  if (data.plugins) {
    for (const plug of data.plugins) {
      const { id, createdAt, updatedAt, ...rest } = plug
      await db.plugin.upsert({ where: { slug: plug.slug }, update: rest, create: { ...rest, id } })
    }
  }

  // Upsert PlatformFlags
  if (data.platformFlags) {
    for (const flag of data.platformFlags) {
      const { id, createdAt, updatedAt, ...rest } = flag
      await db.platformFlag.upsert({ where: { key: flag.key }, update: rest, create: { ...rest, id } })
    }
  }

  console.log("✅ Sync complete")
}

main().catch(console.error).finally(() => db.$disconnect())
