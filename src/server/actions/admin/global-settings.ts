"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { sendTestEmail } from "@/lib/email"
import { requireSuperAdmin } from "../admin-base"
import { encrypt, decrypt } from "@/lib/crypto"
import bcrypt from "bcryptjs"

export async function revealGlobalSetting(key: string, adminPassword: string) {
  const session = await requireSuperAdmin()
  const admin = await db.user.findUnique({ where: { id: session.user.id! } })
  if (!admin?.passwordHash) return { ok: false, error: "Cannot verify identity" }
  const valid = await bcrypt.compare(adminPassword, admin.passwordHash)
  if (!valid) return { ok: false, error: "Incorrect password" }

  const setting = await db.globalSetting.findUnique({ where: { key } })
  if (!setting?.value) return { ok: false, error: "Not found or empty" }

  const sensitiveKeys = ["RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "AUTH_GOOGLE_SECRET", "SMTP_PASS"]
  if (!sensitiveKeys.includes(key)) {
    return { ok: true, value: setting.value }
  }
  
  return { ok: true, value: decrypt(setting.value) }
}

export async function saveGlobalSettings(settings: Record<string, string>) {
  await requireSuperAdmin()

  const sensitiveKeys = ["RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "AUTH_GOOGLE_SECRET", "SMTP_PASS"]
  
  // Use a transaction to upsert all settings
  const upserts = Object.entries(settings).flatMap(([key, value]) => {
    // If it's a masked token, it means it hasn't changed, skip updating
    if (value.includes("••••")) return []
    
    // Encrypt sensitive keys before saving
    let finalValue = value
    if (sensitiveKeys.includes(key) && value) {
      finalValue = encrypt(value)
    }

    return [db.globalSetting.upsert({
      where: { key },
      update: { value: finalValue },
      create: { key, value: finalValue },
    })]
  })

  await db.$transaction(upserts)

  revalidatePath("/admin/settings")
  revalidatePath("/") //  revalidatePath("/", "layout")

  return { success: true }
}

export async function setDefaultFreePlan(planId: string) {
  await requireSuperAdmin()
  
  if (!planId) return { success: true }
  
  await db.$transaction([
    db.plan.updateMany({ data: { isDefaultFree: false } }),
    db.plan.update({ where: { id: planId }, data: { isDefaultFree: true } })
  ])
  
  revalidatePath("/admin/settings")
  return { success: true }
}

export async function sendTestEmailAction(email: string, uiSettings?: Record<string, string>) {
  await requireSuperAdmin()
  
  if (!email || !email.includes("@")) {
    return { error: "Invalid email address" }
  }

  let testConfig = undefined
  if (uiSettings) {
    let pass = (uiSettings.SMTP_PASS || "").trim()
    if (pass.includes("••••")) {
      const dbPass = await db.globalSetting.findUnique({ where: { key: "SMTP_PASS" } })
      pass = dbPass?.value ? decrypt(dbPass.value) : (process.env.SMTP_PASS || "")
    }

    testConfig = {
      host: (uiSettings.SMTP_HOST || process.env.SMTP_HOST || "").trim(),
      port: parseInt((uiSettings.SMTP_PORT || process.env.SMTP_PORT || "587").trim(), 10),
      user: (uiSettings.SMTP_USER || process.env.SMTP_USER || "").trim(),
      pass: pass.trim() || (process.env.SMTP_PASS || "").trim(),
      from: (uiSettings.SMTP_FROM && uiSettings.SMTP_FROM.includes("@")) 
        ? uiSettings.SMTP_FROM.trim()
        : (uiSettings.SMTP_FROM ? `${uiSettings.SMTP_FROM.trim()} <noreply@openordo.com>` : process.env.SMTP_FROM || "OpenORDO <noreply@openordo.com>"),
      fromAuth: (uiSettings.SMTP_FROM_AUTH || "").trim(),
      fromBilling: (uiSettings.SMTP_FROM_BILLING || "").trim(),
      fromGeneral: (uiSettings.SMTP_FROM_GENERAL || "").trim(),
    }
  }

  const result = await sendTestEmail(email, testConfig)
  if (!result) {
    return { error: "Failed to send email. Check your SMTP settings." }
  }
  
  return { success: true }
}

export async function uploadBrandingAsset(formData: FormData) {
  await requireSuperAdmin()

  const file = formData.get("file") as File
  const key = formData.get("key") as string

  if (!file || !key) {
    throw new Error("Missing file or key")
  }

  if (key !== "SEO_FAVICON_URL" && key !== "SEO_OG_IMAGE_URL") {
    throw new Error("Invalid key")
  }

  const fs = await import("fs/promises")
  const path = await import("path")
  const crypto = await import("crypto")

  // Ensure public/uploads exists
  const uploadsDir = path.join(process.cwd(), "public", "uploads")
  await fs.mkdir(uploadsDir, { recursive: true })

  // Generate unique filename
  const ext = file.name.split(".").pop() || "png"
  const random = crypto.randomBytes(8).toString("hex")
  const filename = `${key.toLowerCase()}_${random}.${ext}`
  const filepath = path.join(uploadsDir, filename)

  // Save file
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await fs.writeFile(filepath, buffer)

  const url = `/uploads/${filename}`

  // Update DB
  await db.globalSetting.upsert({
    where: { key },
    update: { value: url },
    create: { key, value: url },
  })

  revalidatePath("/", "layout")

  return { success: true, url }
}
