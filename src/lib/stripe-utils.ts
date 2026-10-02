import { db } from "./db"

export async function getStripeSecretKey(): Promise<string> {
  const setting = await db.globalSetting.findUnique({ where: { key: "STRIPE_SECRET_KEY" } })
  return setting?.value || process.env.STRIPE_SECRET_KEY || ""
}

export async function getStripeWebhookSecret(): Promise<string> {
  const setting = await db.globalSetting.findUnique({ where: { key: "STRIPE_WEBHOOK_SECRET" } })
  return setting?.value || process.env.STRIPE_WEBHOOK_SECRET || ""
}
