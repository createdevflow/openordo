/**
 * Clinic-scoped WhatsApp message sender.
 *
 * SAFETY GUARANTEE: every call receives its variable values as explicit
 * arguments derived from the specific Appointment/Clinic/Doctor at the
 * call site — never from any global, cached, or session-level context.
 * This is the structural enforcement of the multi-tenant isolation rule
 * described in CHARTWELL_WHATSAPP_INTEGRATION_SPEC.md Section 4.
 */

import { db } from "./db"
import { decrypt } from "./crypto"
import { sendTemplateMessage } from "./whatsapp"

export type WaEventType =
  | "OTP_VERIFICATION"
  | "APPOINTMENT_CONFIRMATION"
  | "APPOINTMENT_REMINDER"
  | "APPOINTMENT_CANCELLED"
  | "GENERAL_UPDATE"

export interface SendWaMessageOptions {
  toPhone: string
  eventType: WaEventType
  variables: Record<string, string> // key = variable name, value = display value
  // Tracing fields — always pass what you have
  clinicId?: string
  patientId?: string
  appointmentId?: string
  userId?: string
}

export interface SendWaResult {
  sent: boolean
  metaMessageId?: string
  error?: string
}

/**
 * Load platform settings once per request. Returns null if WhatsApp is not configured.
 */
async function getPlatformSettings() {
  const settings = await db.platformCommunicationSettings.findFirst()
  if (!settings?.whatsappConnected) return null
  if (!settings.whatsappAccessToken || !settings.whatsappPhoneNumberId) return null
  return {
    phoneNumberId: settings.whatsappPhoneNumberId,
    accessToken: decrypt(settings.whatsappAccessToken),
  }
}

/**
 * Send a single WhatsApp template message, write a WhatsAppMessageLog row,
 * and upsert a WhatsAppConversationContext row.
 *
 * Returns { sent: true, metaMessageId } on success or { sent: false, error } on failure.
 * Never throws — callers can safely fire-and-forget or check the result.
 */
export async function sendClinicScopedWhatsAppMessage(
  opts: SendWaMessageOptions
): Promise<SendWaResult> {
  try {
    // 1. Load credentials
    const creds = await getPlatformSettings()
    if (!creds) {
      await logMessage(opts, "FAILED", undefined, "WhatsApp not connected or not configured")
      return { sent: false, error: "WhatsApp not connected or not configured" }
    }

    // 2. Load the template mapping for this event type
    const mapping = await db.whatsAppTemplateMapping.findUnique({
      where: { eventType: opts.eventType },
    })
    if (!mapping || !mapping.isActive || !mapping.metaTemplateName) {
      const err = `No active template for ${opts.eventType}`
      await logMessage(opts, "FAILED", undefined, err)
      return { sent: false, error: err }
    }

    // 3. Build body components from variables in order
    // variablesSchema is a JSON array of variable names in the order Meta expects them.
    let varOrder: string[] = []
    try {
      varOrder = JSON.parse(mapping.variablesSchema)
    } catch {
      varOrder = Object.keys(opts.variables)
    }

    const parameters = varOrder
      .filter((k) => opts.variables[k] !== undefined)
      .map((k) => ({ type: "text" as const, text: opts.variables[k] }))

    const components =
      parameters.length > 0
        ? [{ type: "body" as const, parameters }]
        : []

    // 4. Send via Meta API
    const result = await sendTemplateMessage({
      credentials: creds,
      toPhone: opts.toPhone,
      templateName: mapping.metaTemplateName,
      components,
    })

    // 5. Log + context upsert
    if (result.success) {
      await logMessage(opts, "SENT", result.messageId)
      await upsertConversationContext(opts)
      return { sent: true, metaMessageId: result.messageId }
    } else {
      await logMessage(opts, "FAILED", undefined, result.error)
      return { sent: false, error: result.error }
    }
  } catch (err: any) {
    const errMsg = err?.message || "Unknown error"
    try {
      await logMessage(opts, "FAILED", undefined, errMsg)
    } catch {
      // swallow secondary failure
    }
    return { sent: false, error: errMsg }
  }
}

async function logMessage(
  opts: SendWaMessageOptions,
  status: "SENT" | "FAILED" | "DELIVERED" | "READ",
  metaMessageId?: string,
  errorMessage?: string
) {
  await db.whatsAppMessageLog.create({
    data: {
      clinicId: opts.clinicId ?? null,
      patientId: opts.patientId ?? null,
      appointmentId: opts.appointmentId ?? null,
      userId: opts.userId ?? null,
      toPhone: opts.toPhone,
      eventType: opts.eventType,
      status,
      metaMessageId: metaMessageId ?? null,
      errorMessage: errorMessage ?? null,
    },
  })
}

async function upsertConversationContext(opts: SendWaMessageOptions) {
  if (!opts.clinicId) return // platform-level OTP: no clinic context
  await db.whatsAppConversationContext.upsert({
    where: { phone_clinicId: { phone: opts.toPhone, clinicId: opts.clinicId } },
    update: { lastMessageAt: new Date(), patientId: opts.patientId ?? undefined },
    create: {
      phone: opts.toPhone,
      clinicId: opts.clinicId,
      patientId: opts.patientId ?? null,
      lastMessageAt: new Date(),
    },
  })
}
