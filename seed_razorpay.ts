import { PrismaClient } from "@prisma/client"
import Razorpay from "razorpay"

const db = new PrismaClient()

async function main() {
  // Fetch Razorpay Keys from DB or ENV
  const keySetting = await db.globalSetting.findUnique({ where: { key: "RAZORPAY_KEY_ID" } })
  const secretSetting = await db.globalSetting.findUnique({ where: { key: "RAZORPAY_KEY_SECRET" } })

  const key_id = keySetting?.value || process.env.RAZORPAY_KEY_ID
  const key_secret = secretSetting?.value || process.env.RAZORPAY_KEY_SECRET

  if (!key_id || !key_secret) {
    console.error("No Razorpay keys found! Please add them to your Admin Settings or .env")
    process.exit(1)
  }

  const rzp = new Razorpay({ key_id, key_secret })

  console.log("Connected to Razorpay...")

  // 1. Seed Plans
  const plans = await db.plan.findMany()
  for (const plan of plans) {
    if (plan.priceMonthlyInr === 0) continue // Skip free plans

    // Monthly Plan
    if (!plan.razorpayPlanIdMonthly && plan.priceMonthlyInr > 0) {
      try {
        const rzpPlan = await rzp.plans.create({
          period: "monthly",
          interval: 1,
          item: {
            name: `Plan: ${plan.name} (Monthly)`,
            description: `Monthly subscription for ${plan.name}`,
            amount: plan.priceMonthlyInr * 100, // paise
            currency: "INR"
          }
        })
        await db.plan.update({
          where: { id: plan.id },
          data: { razorpayPlanIdMonthly: rzpPlan.id }
        })
        console.log(`Created Monthly Razorpay Plan for ${plan.name}: ${rzpPlan.id}`)
      } catch (err: any) {
        console.error(`Failed to create monthly plan for ${plan.name}:`, err)
      }
    }
  }

  // 2. Seed Plugins (Recurring only)
  const plugins = await db.plugin.findMany()
  for (const plugin of plugins) {
    if (plugin.priceMonthlyINR && plugin.priceMonthlyINR > 0 && !plugin.razorpayPlanIdMonthly) {
      try {
        const rzpPlan = await rzp.plans.create({
          period: "monthly",
          interval: 1,
          item: {
            name: `Plugin: ${plugin.name} (Monthly)`,
            description: `Monthly subscription for ${plugin.name} plugin`,
            amount: plugin.priceMonthlyINR * 100, // paise
            currency: "INR"
          }
        })
        await db.plugin.update({
          where: { id: plugin.id },
          data: { razorpayPlanIdMonthly: rzpPlan.id }
        })
        console.log(`Created Monthly Razorpay Plan for Plugin ${plugin.name}: ${rzpPlan.id}`)
      } catch (err: any) {
        console.error(`Failed to create monthly plan for plugin ${plugin.name}:`, err)
      }
    }
  }

  console.log("Done seeding Razorpay.")
}

main().catch(console.error).finally(() => db.$disconnect())
