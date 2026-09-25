"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireSuperAdmin, logAudit } from "../admin-base"
import { encrypt, decrypt, maskToken } from "@/lib/crypto"
import { testWhatsAppConnection } from "@/lib/whatsapp"
import bcrypt from "bcryptjs"

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Get or create the singleton PlatformCommunicationSettings row. */
async function getOrCreateSettings() {
  const existing = await db.platformCommunicationSettings.findFirst()
  if (existing) return existing
  return db.platformCommunicationSettings.create({
    data: { updatedAt: new Date() },
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Read (public to admin panel)
// ──────────────────────────────────────────────────────────────────────────────

export async function getWhatsAppSettings() {
  const session = await requireSuperAdmin()
  const settings = await getOrCreateSettings()

  return {
    id: settings.id,
    whatsappNumber: settings.whatsappNumber ?? "",
    whatsappPhoneNumberId: settings.whatsappPhoneNumberId ?? "",
    whatsappBusinessAccountId: settings.whatsappBusinessAccountId ?? "",
    // Token shown masked — reveal requires password re-entry (separate action)
    whatsappAccessTokenMasked: maskToken(settings.whatsappAccessToken ?? ""),
    whatsappAccessTokenSet: !!settings.whatsappAccessToken,
    whatsappWebhookVerifyToken: settings.whatsappWebhookVerifyToken ?? "",
    whatsappConnected: settings.whatsappConnected,
    whatsappLastVerifiedAt: settings.whatsappLastVerifiedAt?.toISOString() ?? null,
    whatsappLastError: settings.whatsappLastError ?? null,
    otpChannel: settings.otpChannel,
    otpBothMode: settings.otpBothMode ?? "USER_CHOOSES",
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Save connection fields (non-token fields)
// ──────────────────────────────────────────────────────────────────────────────

export async function saveWhatsAppConnectionSettings(data: {
  whatsappNumber: string
  whatsappPhoneNumberId: string
  whatsappBusinessAccountId: string
  whatsappWebhookVerifyToken: string
}) {
  const session = await requireSuperAdmin()
  const existing = await getOrCreateSettings()

  await db.platformCommunicationSettings.update({
    where: { id: existing.id },
    data: {
      whatsappNumber: data.whatsappNumber || null,
      whatsappPhoneNumberId: data.whatsappPhoneNumberId || null,
      whatsappBusinessAccountId: data.whatsappBusinessAccountId || null,
      whatsappWebhookVerifyToken: data.whatsappWebhookVerifyToken || null,
      // Reset connected status when credentials change — must re-test
      whatsappConnected: false,
      whatsappLastError: null,
    },
  })

  await logAudit(session.user.id!, "UPDATE_WHATSAPP_CONNECTION_SETTINGS", "PlatformCommunicationSettings", existing.id)
  revalidatePath("/admin/settings")
  return { ok: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// Save/replace access token (encrypted at rest)
// ──────────────────────────────────────────────────────────────────────────────

export async function saveWhatsAppAccessToken(data: {
  newToken: string
  adminPassword: string
}) {
  const session = await requireSuperAdmin()

  // Re-verify admin password — same friction as credential changes
  const admin = await db.user.findUnique({ where: { id: session.user.id! } })
  if (!admin?.passwordHash) return { ok: false, error: "Cannot verify identity" }
  const valid = await bcrypt.compare(data.adminPassword, admin.passwordHash)
  if (!valid) return { ok: false, error: "Incorrect password" }

  const existing = await getOrCreateSettings()
  const encrypted = encrypt(data.newToken)

  await db.platformCommunicationSettings.update({
    where: { id: existing.id },
    data: {
      whatsappAccessToken: encrypted,
      // Reset connection status — must re-test after token change
      whatsappConnected: false,
      whatsappLastError: null,
    },
  })

  await logAudit(session.user.id!, "UPDATE_WHATSAPP_ACCESS_TOKEN", "PlatformCommunicationSettings", existing.id)
  revalidatePath("/admin/settings")
  return { ok: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// Reveal token (requires password re-entry)
// ──────────────────────────────────────────────────────────────────────────────

export async function revealWhatsAppAccessToken(adminPassword: string) {
  const session = await requireSuperAdmin()
  const admin = await db.user.findUnique({ where: { id: session.user.id! } })
  if (!admin?.passwordHash) return { ok: false, error: "Cannot verify identity" }
  const valid = await bcrypt.compare(adminPassword, admin.passwordHash)
  if (!valid) return { ok: false, error: "Incorrect password" }

  const settings = await db.platformCommunicationSettings.findFirst()
  if (!settings?.whatsappAccessToken) return { ok: false, error: "No token stored" }

  const plain = decrypt(settings.whatsappAccessToken)
  await logAudit(session.user.id!, "REVEAL_WHATSAPP_ACCESS_TOKEN", "PlatformCommunicationSettings", settings.id)
  return { ok: true, token: plain }
}

// ──────────────────────────────────────────────────────────────────────────────
// Test connection — real Meta API call
// ──────────────────────────────────────────────────────────────────────────────

export async function testWhatsAppConnectionAction() {
  const session = await requireSuperAdmin()
  const settings = await db.platformCommunicationSettings.findFirst()

  if (!settings?.whatsappPhoneNumberId || !settings?.whatsappAccessToken) {
    return { ok: false, error: "Phone Number ID and Access Token are required before testing" }
  }

  const plainToken = decrypt(settings.whatsappAccessToken)
  const result = await testWhatsAppConnection({
    phoneNumberId: settings.whatsappPhoneNumberId,
    accessToken: plainToken,
  })

  if (result.success) {
    await db.platformCommunicationSettings.update({
      where: { id: settings.id },
      data: {
        whatsappConnected: true,
        whatsappLastVerifiedAt: new Date(),
        whatsappLastError: null,
      },
    })
    await logAudit(session.user.id!, "TEST_WHATSAPP_CONNECTION_SUCCESS", "PlatformCommunicationSettings", settings.id)
    revalidatePath("/admin/settings")
    return { ok: true, message: `Connected · ${result.displayPhone}` }
  } else {
    await db.platformCommunicationSettings.update({
      where: { id: settings.id },
      data: {
        whatsappConnected: false,
        whatsappLastError: result.error,
      },
    })
    await logAudit(session.user.id!, "TEST_WHATSAPP_CONNECTION_FAILED", "PlatformCommunicationSettings", settings.id, { error: result.error })
    revalidatePath("/admin/settings")
    return { ok: false, error: result.error }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// OTP channel settings
// ──────────────────────────────────────────────────────────────────────────────

export async function saveOtpChannelSettings(data: {
  otpChannel: "EMAIL" | "WHATSAPP" | "BOTH"
  otpBothMode: "USER_CHOOSES" | "SEND_BOTH"
}) {
  const session = await requireSuperAdmin()
  const existing = await getOrCreateSettings()

  await db.platformCommunicationSettings.update({
    where: { id: existing.id },
    data: {
      otpChannel: data.otpChannel,
      otpBothMode: data.otpChannel === "BOTH" ? data.otpBothMode : null,
    },
  })

  await logAudit(session.user.id!, "UPDATE_OTP_CHANNEL_SETTINGS", "PlatformCommunicationSettings", existing.id, data)
  revalidatePath("/admin/settings")
  return { ok: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// Template mappings
// ──────────────────────────────────────────────────────────────────────────────

const WA_EVENT_TYPES = [
  "OTP_VERIFICATION",
  "APPOINTMENT_CONFIRMATION",
  "APPOINTMENT_REMINDER",
  "APPOINTMENT_CANCELLED",
  "GENERAL_UPDATE",
] as const

export async function getWhatsAppTemplateMappings() {
  const session = await requireSuperAdmin()
  const rows = await db.whatsAppTemplateMapping.findMany()

  // Ensure all five rows exist (seed on first access)
  const existingTypes = new Set(rows.map((r) => r.eventType))
  const missing = WA_EVENT_TYPES.filter((t) => !existingTypes.has(t))

  if (missing.length > 0) {
    await db.$transaction(
      missing.map((eventType) =>
        db.whatsAppTemplateMapping.upsert({
          where: { eventType },
          update: {},
          create: {
            eventType,
            metaTemplateName: "",
            variablesSchema: defaultVariableSchema(eventType),
            isActive: false,
          },
        })
      )
    )
    return db.whatsAppTemplateMapping.findMany({ orderBy: { eventType: "asc" } })
  }

  return rows.sort((a, b) => a.eventType.localeCompare(b.eventType))
}

export async function saveWhatsAppTemplateMapping(data: {
  id: string
  metaTemplateName: string
  isActive: boolean
}) {
  const session = await requireSuperAdmin()

  const updated = await db.whatsAppTemplateMapping.update({
    where: { id: data.id },
    data: {
      metaTemplateName: data.metaTemplateName.trim(),
      // Can only be active if a name is set
      isActive: !!data.metaTemplateName.trim() && data.isActive,
    },
  })

  await logAudit(session.user.id!, "UPDATE_WHATSAPP_TEMPLATE_MAPPING", "WhatsAppTemplateMapping", data.id, {
    eventType: updated.eventType,
    metaTemplateName: data.metaTemplateName,
    isActive: data.isActive,
  })
  revalidatePath("/admin/settings")
  return { ok: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// Activity summary for Section 2.4
// ──────────────────────────────────────────────────────────────────────────────

export async function getWhatsAppActivitySummary() {
  const session = await requireSuperAdmin()

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - 7)

  const [sentToday, sentThisWeek, failedThisWeek, recentLogs] = await Promise.all([
    db.whatsAppMessageLog.count({ where: { sentAt: { gte: todayStart }, status: { not: "FAILED" } } }),
    db.whatsAppMessageLog.count({ where: { sentAt: { gte: weekStart }, status: { not: "FAILED" } } }),
    db.whatsAppMessageLog.count({ where: { sentAt: { gte: weekStart }, status: "FAILED" } }),
    db.whatsAppMessageLog.findMany({
      orderBy: { sentAt: "desc" },
      take: 20,
    }),
  ])

  const totalThisWeek = sentThisWeek + failedThisWeek
  const deliveryRate = totalThisWeek > 0
    ? Math.round((sentThisWeek / totalThisWeek) * 100)
    : null

  return {
    sentToday,
    sentThisWeek,
    failedThisWeek,
    deliveryRate,
    recentLogs,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function defaultVariableSchema(eventType: string): string {
  const schemas: Record<string, string[]> = {
    OTP_VERIFICATION: ["otp_code", "expiry_minutes"],
    APPOINTMENT_CONFIRMATION: ["clinic_name", "clinic_address", "clinic_phone", "patient_name", "doctor_name", "date", "time"],
    APPOINTMENT_REMINDER: ["clinic_name", "patient_name", "doctor_name", "date", "time"],
    APPOINTMENT_CANCELLED: ["clinic_name", "patient_name", "doctor_name", "date", "time"],
    GENERAL_UPDATE: ["clinic_name", "message"],
  }
  return JSON.stringify(schemas[eventType] ?? [])
}
