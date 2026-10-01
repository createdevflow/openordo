"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireSuperAdmin, logAudit } from "../admin-base"
import { encrypt, decrypt, maskToken } from "@/lib/crypto"
import { testSmsConnectionIndia, testSmsConnectionInternational } from "@/lib/sms"
import bcrypt from "bcryptjs"

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

async function getOrCreateSettings() {
  const existing = await db.platformCommunicationSettings.findFirst()
  if (existing) return existing
  return db.platformCommunicationSettings.create({ data: { updatedAt: new Date() } })
}

// ──────────────────────────────────────────────────────────────────────────────
// Read SMS settings for admin panel
// ──────────────────────────────────────────────────────────────────────────────

export async function getSmsSettings() {
  await requireSuperAdmin()
  const settings = await getOrCreateSettings()

  return {
    // India
    smsProviderIndia: settings.smsProviderIndia ?? "MSG91",
    smsApiKeyIndiaMasked: maskToken(settings.smsApiKeyIndia ?? ""),
    smsApiKeyIndiaSet: !!settings.smsApiKeyIndia,
    smsSenderIdIndia: settings.smsSenderIdIndia ?? "",
    smsDltTemplateIdOtp: settings.smsDltTemplateIdOtp ?? "",
    smsDltTemplateIdConfirmation: settings.smsDltTemplateIdConfirmation ?? "",
    smsConnectedIndia: settings.smsConnectedIndia,
    // International
    smsProviderInternational: settings.smsProviderInternational ?? "TWILIO",
    smsAccountSidInternational: settings.smsAccountSidInternational ?? "",
    smsAuthTokenInternationalMasked: maskToken(settings.smsAuthTokenInternational ?? ""),
    smsAuthTokenInternationalSet: !!settings.smsAuthTokenInternational,
    smsFromNumberInternational: settings.smsFromNumberInternational ?? "",
    smsConnectedInternational: settings.smsConnectedInternational,
    // Channel settings
    otpChannels: settings.otpChannels,
    otpMode: settings.otpMode,
    appointmentConfirmationFallbackChannel: settings.appointmentConfirmationFallbackChannel,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Save India SMS connection settings (non-sensitive fields)
// ──────────────────────────────────────────────────────────────────────────────

export async function saveSmsIndiaSettings(data: {
  smsProviderIndia: string
  smsSenderIdIndia: string
  smsDltTemplateIdOtp: string
  smsDltTemplateIdConfirmation: string
}) {
  const session = await requireSuperAdmin()
  const existing = await getOrCreateSettings()

  await db.platformCommunicationSettings.update({
    where: { id: existing.id },
    data: {
      smsProviderIndia: data.smsProviderIndia || null,
      smsSenderIdIndia: data.smsSenderIdIndia || null,
      smsDltTemplateIdOtp: data.smsDltTemplateIdOtp || null,
      smsDltTemplateIdConfirmation: data.smsDltTemplateIdConfirmation || null,
      // Reset connected status when non-credential settings change
      smsConnectedIndia: false,
    },
  })

  await logAudit(session.user.id!, "UPDATE_SMS_INDIA_SETTINGS", "PlatformCommunicationSettings", existing.id)
  revalidatePath("/admin/settings")
  return { ok: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// Save India API Key (encrypted at rest — same util as WhatsApp token)
// ──────────────────────────────────────────────────────────────────────────────

export async function saveSmsApiKeyIndia(data: {
  newApiKey: string
  adminPassword: string
}) {
  const session = await requireSuperAdmin()
  const admin = await db.user.findUnique({ where: { id: session.user.id! } })
  if (!admin?.passwordHash) return { ok: false, error: "Cannot verify identity" }
  const valid = await bcrypt.compare(data.adminPassword, admin.passwordHash)
  if (!valid) return { ok: false, error: "Incorrect password" }

  const existing = await getOrCreateSettings()
  const encrypted = encrypt(data.newApiKey)

  await db.platformCommunicationSettings.update({
    where: { id: existing.id },
    data: {
      smsApiKeyIndia: encrypted,
      smsConnectedIndia: false,
    },
  })

  await logAudit(session.user.id!, "UPDATE_SMS_API_KEY_INDIA", "PlatformCommunicationSettings", existing.id)
  revalidatePath("/admin/settings")
  return { ok: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// Reveal India API Key (requires password re-entry)
// ──────────────────────────────────────────────────────────────────────────────

export async function revealSmsApiKeyIndia(adminPassword: string) {
  const session = await requireSuperAdmin()
  const admin = await db.user.findUnique({ where: { id: session.user.id! } })
  if (!admin?.passwordHash) return { ok: false, error: "Cannot verify identity" }
  const valid = await bcrypt.compare(adminPassword, admin.passwordHash)
  if (!valid) return { ok: false, error: "Incorrect password" }

  const settings = await db.platformCommunicationSettings.findFirst()
  if (!settings?.smsApiKeyIndia) return { ok: false, error: "No API key stored" }

  const plain = decrypt(settings.smsApiKeyIndia)
  await logAudit(session.user.id!, "REVEAL_SMS_API_KEY_INDIA", "PlatformCommunicationSettings", settings.id)
  return { ok: true, token: plain }
}

// ──────────────────────────────────────────────────────────────────────────────
// Test India SMS connection
// ──────────────────────────────────────────────────────────────────────────────

export async function testSmsConnectionIndiaAction() {
  const session = await requireSuperAdmin()
  const result = await testSmsConnectionIndia()

  const settings = await db.platformCommunicationSettings.findFirst()
  if (settings) {
    await db.platformCommunicationSettings.update({
      where: { id: settings.id },
      data: {
        smsConnectedIndia: result.success,
        smsLastVerifiedAt: result.success ? new Date() : undefined,
      },
    })
  }

  await logAudit(
    session.user.id!,
    result.success ? "TEST_SMS_INDIA_SUCCESS" : "TEST_SMS_INDIA_FAILED",
    "PlatformCommunicationSettings",
    settings?.id ?? "unknown",
    { error: result.error }
  )
  revalidatePath("/admin/settings")
  return result
}

// ──────────────────────────────────────────────────────────────────────────────
// Save International SMS settings (non-sensitive fields)
// ──────────────────────────────────────────────────────────────────────────────

export async function saveSmsInternationalSettings(data: {
  smsAccountSidInternational: string
  smsFromNumberInternational: string
}) {
  const session = await requireSuperAdmin()
  const existing = await getOrCreateSettings()

  await db.platformCommunicationSettings.update({
    where: { id: existing.id },
    data: {
      smsProviderInternational: "TWILIO",
      smsAccountSidInternational: data.smsAccountSidInternational || null,
      smsFromNumberInternational: data.smsFromNumberInternational || null,
      smsConnectedInternational: false,
    },
  })

  await logAudit(session.user.id!, "UPDATE_SMS_INTERNATIONAL_SETTINGS", "PlatformCommunicationSettings", existing.id)
  revalidatePath("/admin/settings")
  return { ok: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// Save International Auth Token (encrypted at rest)
// ──────────────────────────────────────────────────────────────────────────────

export async function saveSmsAuthTokenInternational(data: {
  newToken: string
  adminPassword: string
}) {
  const session = await requireSuperAdmin()
  const admin = await db.user.findUnique({ where: { id: session.user.id! } })
  if (!admin?.passwordHash) return { ok: false, error: "Cannot verify identity" }
  const valid = await bcrypt.compare(data.adminPassword, admin.passwordHash)
  if (!valid) return { ok: false, error: "Incorrect password" }

  const existing = await getOrCreateSettings()
  const encrypted = encrypt(data.newToken)

  await db.platformCommunicationSettings.update({
    where: { id: existing.id },
    data: {
      smsAuthTokenInternational: encrypted,
      smsConnectedInternational: false,
    },
  })

  await logAudit(session.user.id!, "UPDATE_SMS_AUTH_TOKEN_INTERNATIONAL", "PlatformCommunicationSettings", existing.id)
  revalidatePath("/admin/settings")
  return { ok: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// Reveal International Auth Token (requires password re-entry)
// ──────────────────────────────────────────────────────────────────────────────

export async function revealSmsAuthTokenInternational(adminPassword: string) {
  const session = await requireSuperAdmin()
  const admin = await db.user.findUnique({ where: { id: session.user.id! } })
  if (!admin?.passwordHash) return { ok: false, error: "Cannot verify identity" }
  const valid = await bcrypt.compare(adminPassword, admin.passwordHash)
  if (!valid) return { ok: false, error: "Incorrect password" }

  const settings = await db.platformCommunicationSettings.findFirst()
  if (!settings?.smsAuthTokenInternational) return { ok: false, error: "No auth token stored" }

  const plain = decrypt(settings.smsAuthTokenInternational)
  await logAudit(session.user.id!, "REVEAL_SMS_AUTH_TOKEN_INTERNATIONAL", "PlatformCommunicationSettings", settings.id)
  return { ok: true, token: plain }
}

// ──────────────────────────────────────────────────────────────────────────────
// Test International SMS connection
// ──────────────────────────────────────────────────────────────────────────────

export async function testSmsConnectionInternationalAction() {
  const session = await requireSuperAdmin()
  const result = await testSmsConnectionInternational()

  const settings = await db.platformCommunicationSettings.findFirst()
  if (settings) {
    await db.platformCommunicationSettings.update({
      where: { id: settings.id },
      data: {
        smsConnectedInternational: result.success,
        smsLastVerifiedAt: result.success ? new Date() : undefined,
      },
    })
  }

  await logAudit(
    session.user.id!,
    result.success ? "TEST_SMS_INTERNATIONAL_SUCCESS" : "TEST_SMS_INTERNATIONAL_FAILED",
    "PlatformCommunicationSettings",
    settings?.id ?? "unknown",
    { error: result.error }
  )
  revalidatePath("/admin/settings")
  return result
}

// ──────────────────────────────────────────────────────────────────────────────
// Save OTP channel settings (new multi-channel version)
// ──────────────────────────────────────────────────────────────────────────────

export async function saveOtpChannelSettingsV2(data: {
  otpChannels: string[]
  otpMode: string
}) {
  const session = await requireSuperAdmin()
  const existing = await getOrCreateSettings()

  const validChannels = data.otpChannels.filter(c => ["EMAIL", "WHATSAPP", "SMS"].includes(c))
  const channels = validChannels.length > 0 ? validChannels : ["EMAIL"]

  await db.platformCommunicationSettings.update({
    where: { id: existing.id },
    data: {
      otpChannels: channels,
      otpMode: channels.length > 1 ? (data.otpMode || "USER_CHOOSES") : "USER_CHOOSES",
    },
  })

  await logAudit(session.user.id!, "UPDATE_OTP_CHANNEL_SETTINGS_V2", "PlatformCommunicationSettings", existing.id, data)
  revalidatePath("/admin/settings")
  return { ok: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// Save appointment confirmation fallback channel
// ──────────────────────────────────────────────────────────────────────────────

export async function saveAppointmentFallbackChannel(channel: "EMAIL" | "SMS") {
  const session = await requireSuperAdmin()
  const existing = await getOrCreateSettings()

  await db.platformCommunicationSettings.update({
    where: { id: existing.id },
    data: { appointmentConfirmationFallbackChannel: channel },
  })

  await logAudit(session.user.id!, "UPDATE_APPOINTMENT_FALLBACK_CHANNEL", "PlatformCommunicationSettings", existing.id, { channel })
  revalidatePath("/admin/settings")
  return { ok: true }
}
