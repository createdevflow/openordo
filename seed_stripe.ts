import { PrismaClient } from "@prisma/client"
import Stripe from "stripe"

const db = new PrismaClient()

async function run() {
  const globalSetting = await db.globalSetting.findUnique({ where: { key: "STRIPE_SECRET_KEY" } })
  const secret = globalSetting?.value || process.env.STRIPE_SECRET_KEY
  if (!secret) {
    console.error("Stripe Secret Key not found in DB or .env")
    process.exit(1)
  }

  const stripe = new Stripe(secret, { apiVersion: "2024-06-20" as any })
  
  console.log("Setting up Stripe Products for Plans...")
  const plans = await db.plan.findMany()
  
  for (const plan of plans) {
    if (plan.priceMonthlyUsd === 0 && plan.priceMonthlyInr === 0) continue // Skip free plans unless we want a 0 price
    
    // Monthly USD
    if (plan.priceMonthlyUsd! > 0) {
      let productId = plan.stripeProductId
      if (!productId) {
        const product = await stripe.products.create({
          name: `Plan: ${plan.name}`,
          metadata: { type: "PLAN", planId: plan.id }
        })
        productId = product.id
        await db.plan.update({ where: { id: plan.id }, data: { stripeProductId: productId } })
      }
      
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: plan.priceMonthlyUsd! * 100, // cents
        currency: "usd",
        recurring: { interval: "month" },
      })
      await db.plan.update({ where: { id: plan.id }, data: { stripePriceIdMonthly: price.id } })
      console.log(`Created Monthly USD Price for Plan ${plan.name}: ${price.id}`)
    }
  }

  console.log("\nSetting up Stripe Products for Plugins...")
  const plugins = await db.plugin.findMany()
  
  for (const plugin of plugins) {
    let productId = plugin.stripeProductId
    if (!productId) {
      const product = await stripe.products.create({
        name: `Plugin: ${plugin.name}`,
        metadata: { type: "PLUGIN", pluginId: plugin.id }
      })
      productId = product.id
      await db.plugin.update({ where: { id: plugin.id }, data: { stripeProductId: productId } })
    }

    // Monthly USD
    if (plugin.priceMonthlyUSD! > 0) {
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: plugin.priceMonthlyUSD!, // cents (already in cents in DB! wait, priceMonthlyUSD in DB is already in cents, e.g. 1499)
        currency: "usd",
        recurring: { interval: "month" },
      })
      await db.plugin.update({ where: { id: plugin.id }, data: { stripePriceIdMonthly: price.id } })
      console.log(`Created Monthly USD Price for Plugin ${plugin.name}: ${price.id}`)
    }

    // One-Time USD
    if (plugin.priceOneTimeUSD! > 0) {
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: plugin.priceOneTimeUSD!, // cents
        currency: "usd",
      })
      await db.plugin.update({ where: { id: plugin.id }, data: { stripePriceIdOneTime: price.id } })
      console.log(`Created One-Time USD Price for Plugin ${plugin.name}: ${price.id}`)
    }
  }

  console.log("Stripe setup complete!")
}

run().catch(console.error).finally(() => db.$disconnect())
