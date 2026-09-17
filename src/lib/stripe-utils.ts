import { db } from "@/lib/db"

/**
 * Gets the effective Stripe Public Key.
 * Priority: 1. DB GlobalSettings 2. process.env
 */
export async function getStripePublicKey(): Promise<string> {
  try {
    const setting = await db.globalSetting.findUnique({ where: { key: "STRIPE_PUBLIC_KEY" } })
    if (setting?.value) return setting.value
  } catch (e) {
    // Ignore db error, fallback to env
  }
  return process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || ""
}

/**
 * Gets the effective Stripe Secret Key.
 * Priority: 1. DB GlobalSettings 2. process.env
 */
export async function getStripeSecretKey(): Promise<string> {
  try {
    const setting = await db.globalSetting.findUnique({ where: { key: "STRIPE_SECRET_KEY" } })
    if (setting?.value) return setting.value
  } catch (e) {
    // Ignore db error, fallback to env
  }
  return process.env.STRIPE_SECRET_KEY || ""
}

/**
 * Gets the effective Stripe Webhook Secret.
 * Priority: 1. DB GlobalSettings 2. process.env
 */
export async function getStripeWebhookSecret(): Promise<string> {
  try {
    const setting = await db.globalSetting.findUnique({ where: { key: "STRIPE_WEBHOOK_SECRET" } })
    if (setting?.value) return setting.value
  } catch (e) {
    // Ignore db error, fallback to env
  }
  return process.env.STRIPE_WEBHOOK_SECRET || ""
}
