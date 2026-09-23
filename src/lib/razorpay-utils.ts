import { db } from "@/lib/db"

/**
 * Gets the effective Razorpay Key ID.
 * Priority: 1. DB GlobalSettings 2. process.env
 */
export async function getRazorpayKeyId(): Promise<string> {
  try {
    const setting = await db.globalSetting.findUnique({ where: { key: "RAZORPAY_KEY_ID" } })
    if (setting?.value) return setting.value
  } catch (e) {
    // Ignore db error, fallback to env
  }
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ""
}

/**
 * Gets the effective Razorpay Key Secret.
 * Priority: 1. DB GlobalSettings 2. process.env
 */
export async function getRazorpayKeySecret(): Promise<string> {
  try {
    const setting = await db.globalSetting.findUnique({ where: { key: "RAZORPAY_KEY_SECRET" } })
    if (setting?.value) return setting.value
  } catch (e) {
    // Ignore db error, fallback to env
  }
  return process.env.RAZORPAY_KEY_SECRET || ""
}

/**
 * Gets the effective Razorpay Webhook Secret.
 * Priority: 1. DB GlobalSettings 2. process.env
 */
export async function getRazorpayWebhookSecret(): Promise<string> {
  try {
    const setting = await db.globalSetting.findUnique({ where: { key: "RAZORPAY_WEBHOOK_SECRET" } })
    if (setting?.value) return setting.value
  } catch (e) {
    // Ignore db error, fallback to env
  }
  return process.env.RAZORPAY_WEBHOOK_SECRET || ""
}

/**
 * Checks if Developer Bypass Mode is enabled.
 */
export async function isRazorpayBypassMode(): Promise<boolean> {
  try {
    const setting = await db.globalSetting.findUnique({ where: { key: "RAZORPAY_BYPASS_MODE" } })
    if (setting?.value === "true") return true
  } catch (e) {
    // Ignore db error
  }
  return false
}
