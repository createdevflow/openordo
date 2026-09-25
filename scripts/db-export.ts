import { PrismaClient } from "@prisma/client"
import fs from "fs"
import path from "path"

const db = new PrismaClient()

async function main() {
  console.log("Exporting configuration data...")
  const plans = await db.plan.findMany()
  const features = await db.feature.findMany()
  const planFeatures = await db.planFeature.findMany()
  const plugins = await db.plugin.findMany()
  const platformFlags = await db.platformFlag.findMany()

  const data = {
    plans,
    features,
    planFeatures,
    plugins,
    platformFlags
  }

  const outPath = path.join(process.cwd(), "prisma", "seed-data.json")
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2))
  console.log(`✅ Exported config to ${outPath}`)
}

main().catch(console.error).finally(() => db.$disconnect())
