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

  // Upsert Features and build ID map
  const featureIdMap = {} // local ID -> VPS ID
  if (data.features) {
    for (const f of data.features) {
      const { id: localId, createdAt, updatedAt, ...rest } = f
      const synced = await db.feature.upsert({ where: { key: f.key }, update: rest, create: rest })
      featureIdMap[localId] = synced.id
    }
  }

  // Upsert Plans and build ID map
  const planIdMap = {} // local ID -> VPS ID
  if (data.plans) {
    for (const p of data.plans) {
      const { id: localId, createdAt, updatedAt, ...rest } = p
      const synced = await db.plan.upsert({ where: { slug: p.slug }, update: rest, create: rest })
      planIdMap[localId] = synced.id
    }
  }

  // Upsert PlanFeatures using mapped IDs
  if (data.planFeatures) {
    for (const pf of data.planFeatures) {
      const { createdAt, updatedAt, ...rest } = pf
      const vpsPlanId = planIdMap[pf.planId]
      const vpsFeatureId = featureIdMap[pf.featureId]
      
      if (!vpsPlanId || !vpsFeatureId) continue;

      await db.planFeature.upsert({
        where: { planId_featureId: { planId: vpsPlanId, featureId: vpsFeatureId } },
        update: { included: rest.included },
        create: { planId: vpsPlanId, featureId: vpsFeatureId, included: rest.included }
      })
    }
  }

  // Upsert Plugins
  if (data.plugins) {
    for (const plug of data.plugins) {
      const { id, createdAt, updatedAt, ...rest } = plug
      await db.plugin.upsert({ where: { slug: plug.slug }, update: rest, create: rest })
    }
  }

  // Upsert PlatformFlags
  if (data.platformFlags) {
    for (const flag of data.platformFlags) {
      const { id, createdAt, updatedAt, ...rest } = flag
      await db.platformFlag.upsert({ where: { key: flag.key }, update: rest, create: rest })
    }
  }

  console.log("✅ Sync complete")
}

main().catch(console.error).finally(() => db.$disconnect())
