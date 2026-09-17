import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function run() {
  const plugins = await db.plugin.findMany()
  console.dir(plugins, { depth: null })
  
  const plans = await db.plan.findMany()
  console.dir(plans, { depth: null })
}

run()
