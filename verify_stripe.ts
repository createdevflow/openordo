import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  const plans = await db.plan.findMany({ select: { name: true, stripePriceIdMonthly: true } })
  console.log("PLANS:")
  console.table(plans)
  
  const plugins = await db.plugin.findMany({ select: { name: true, stripePriceIdMonthly: true, stripePriceIdOneTime: true } })
  console.log("PLUGINS:")
  console.table(plugins)
}

main().finally(() => db.$disconnect())
