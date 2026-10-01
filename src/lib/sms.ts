/**
 * SMS provider interface and implementations.
 *
 * SCOPE: SMS is used ONLY for OTP_VERIFICATION and APPOINTMENT_CONFIRMATION.
 * This is a structural restriction enforced in sendSms() — not a UI convention.
 * See CHARTWELL_SMS_INTEGRATION_SPEC.md Section 6.
 *
 * PROVIDERS:
 * - India (+91): MSG91 (or Kaleyra) — requires DLT-registered template IDs
 * - International (all other numbers): Twilio
 *
 * ENCRYPTION: smsApiKeyIndia and smsAuthTokenInternational are encrypted
 * at rest using the same AES-256-GCM utility as whatsappAccessToken.
 * See src/lib/crypto.ts.
 */

import { db } from "./db"
import { decrypt } from "./crypto"

// ─────────────────────────────────────────────────────────────────────────────
// Structural restriction — hard constant, not database-configurable
// ─────────────────────────────────────────────────────────────────────────────

const SMS_ELIGIBLE_EVENT_TYPES = [
  "OTP_VERIFICATION",
  "APPOINTMENT_CONFIRMATION",
] as const

export type SmsEventType = (typeof SMS_ELIGIBLE_EVENT_TYPES)[number]

// ─────────────────────────────────────────────────────────────────────────────
// Provider interface
// ─────────────────────────────────────────────────────────────────────────────

export interface SmsProvider {
  /** Send a single SMS. Returns a provider message ID on success, throws on failure. */
  send(params: {
    to: string
    templateId: string
    variables: Record<string, string>
    /** Sender ID (India only — DLT registered) */
    senderId?: string
    /** Free-form body text (International/Twilio — no template IDs required) */
    body?: string
  }): Promise<{ messageId: string }>
}

// ─────────────────────────────────────────────────────────────────────────────
// MSG91 implementation (India)
// https://docs.msg91.com/p/Tm0PEMqX-send-sms-api
// ─────────────────────────────────────────────────────────────────────────────

class Msg91Provider implements SmsProvider {
  constructor(
    private readonly apiKey: string,
    private readonly senderId: string
  ) {}

  async send(params: {
    to: string
    templateId: string
    variables: Record<string, string>
    senderId?: string
    body?: string
  }): Promise<{ messageId: string }> {
    const sid = params.senderId || this.senderId
    if (!this.templateId_warn(params.templateId)) {
      throw new Error("MSG91: templateId is required for India sends (DLT compliance)")
    }

    // Build MSG91 Flow API payload
    const phone = params.to.replace(/\D/g, "") // strip non-digits

    // MSG91 supports DLT template IDs via their Flow API
    const payload = {
      template_id: params.templateId,
      short_url: "0",
      realTimeResponse: "1",
      recipients: [
        {
          mobiles: phone,
          ...params.variables,
        },
      ],
      sender: sid,
    }

    const response = await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: this.apiKey,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json() as any
    if (data.type === "error") {
      throw new Error(`MSG91 error: ${data.message || JSON.stringify(data)}`)
    }

    const messageId = data.request_id || data.message || "msg91-sent"
    return { messageId }
  }

  private templateId_warn(templateId: string): boolean {
    return !!templateId && templateId.trim().length > 0
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Twilio implementation (International)
// https://www.twilio.com/docs/sms/api/message-resource#create-a-message-resource
// ─────────────────────────────────────────────────────────────────────────────

class TwilioProvider implements SmsProvider {
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly fromNumber: string
  ) {}

  async send(params: {
    to: string
    templateId: string
    variables: Record<string, string>
    body?: string
  }): Promise<{ messageId: string }> {
    // Twilio doesn't use DLT template IDs — compose body from variables
    const body = params.body || this.buildBody(params.variables)

    const formData = new URLSearchParams({
      From: this.fromNumber,
      To: params.to,
      Body: body,
    })

    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    )

    const data = await response.json() as any
    if (data.status && data.status >= 400) {
      throw new Error(`Twilio error: ${data.message || JSON.stringify(data)}`)
    }
    if (data.error_code) {
      throw new Error(`Twilio error ${data.error_code}: ${data.error_message || JSON.stringify(data)}`)
    }

    return { messageId: data.sid || "twilio-sent" }
  }

  private buildBody(variables: Record<string, string>): string {
    // Default message body using available variables
    const { otp_code, expiry_minutes, clinic_name, patient_name, doctor_name, date, time } = variables
    if (otp_code) {
      return `Your OpenORDO verification code is: ${otp_code}. Valid for ${expiry_minutes || "15"} minutes. Do not share this code.`
    }
    if (clinic_name && date && time) {
      return `Hi ${patient_name || "there"}, your appointment with ${doctor_name || "your doctor"} at ${clinic_name} is confirmed for ${date} at ${time}.`
    }
    return Object.values(variables).join(" ")
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Router — selects provider based on recipient's country code
// ─────────────────────────────────────────────────────────────────────────────

function isIndiaNumber(phone: string): boolean {
  const clean = phone.replace(/\s/g, "")
  return clean.startsWith("+91") || /^91\d{10}$/.test(clean) || /^[6-9]\d{9}$/.test(clean)
}

interface SmsSettings {
  // India
  smsProviderIndia: string | null
  smsApiKeyIndia: string | null
  smsSenderIdIndia: string | null
  smsDltTemplateIdOtp: string | null
  smsDltTemplateIdConfirmation: string | null
  smsConnectedIndia: boolean
  // International
  smsAccountSidInternational: string | null
  smsAuthTokenInternational: string | null
  smsFromNumberInternational: string | null
  smsConnectedInternational: boolean
  // Shared
  appointmentConfirmationFallbackChannel: string
}

async function getSmsSettings(): Promise<SmsSettings | null> {
  const settings = await db.platformCommunicationSettings.findFirst()
  if (!settings) return null
  return {
    smsProviderIndia: settings.smsProviderIndia,
    smsApiKeyIndia: settings.smsApiKeyIndia ? decrypt(settings.smsApiKeyIndia) : null,
    smsSenderIdIndia: settings.smsSenderIdIndia,
    smsDltTemplateIdOtp: settings.smsDltTemplateIdOtp,
    smsDltTemplateIdConfirmation: settings.smsDltTemplateIdConfirmation,
    smsConnectedIndia: settings.smsConnectedIndia,
    smsAccountSidInternational: settings.smsAccountSidInternational,
    smsAuthTokenInternational: settings.smsAuthTokenInternational ? decrypt(settings.smsAuthTokenInternational) : null,
    smsFromNumberInternational: settings.smsFromNumberInternational,
    smsConnectedInternational: settings.smsConnectedInternational,
    appointmentConfirmationFallbackChannel: settings.appointmentConfirmationFallbackChannel,
  }
}

function getProvider(settings: SmsSettings, toPhone: string): { provider: SmsProvider; providerName: string; templateIdOtp: string; templateIdConfirmation: string } | null {
  if (isIndiaNumber(toPhone)) {
    if (!settings.smsApiKeyIndia || !settings.smsSenderIdIndia) return null
    return {
      provider: new Msg91Provider(settings.smsApiKeyIndia, settings.smsSenderIdIndia),
      providerName: settings.smsProviderIndia || "MSG91",
      templateIdOtp: settings.smsDltTemplateIdOtp || "",
      templateIdConfirmation: settings.smsDltTemplateIdConfirmation || "",
    }
  } else {
    if (!settings.smsAccountSidInternational || !settings.smsAuthTokenInternational || !settings.smsFromNumberInternational) return null
    return {
      provider: new TwilioProvider(
        settings.smsAccountSidInternational,
        settings.smsAuthTokenInternational,
        settings.smsFromNumberInternational
      ),
      providerName: "TWILIO",
      templateIdOtp: "otp", // Twilio doesn't use DLT template IDs
      templateIdConfirmation: "confirmation",
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// sendSms() — the single guarded entry point for ALL SMS sends
//
// STRUCTURAL RESTRICTION: only OTP_VERIFICATION and APPOINTMENT_CONFIRMATION
// are permitted. Any other eventType throws immediately. This is not a soft
// convention — it is the enforced hard rule per spec Section 6.
// ─────────────────────────────────────────────────────────────────────────────

export interface SendSmsOptions {
  toPhone: string
  eventType: string
  variables: Record<string, string>
  // Tracing
  clinicId?: string
  patientId?: string
  appointmentId?: string
  userId?: string
}

export interface SendSmsResult {
  sent: boolean
  providerMessageId?: string
  provider?: string
  error?: string
}

/**
 * Send a single SMS message.
 *
 * THROWS if eventType is not in SMS_ELIGIBLE_EVENT_TYPES.
 * Never throws for provider errors — returns { sent: false, error } instead.
 */
export async function sendSms(opts: SendSmsOptions): Promise<SendSmsResult> {
  // ── STRUCTURAL GUARD — must be first ──
  if (!SMS_ELIGIBLE_EVENT_TYPES.includes(opts.eventType as SmsEventType)) {
    throw new Error(
      `SMS is not permitted for event type "${opts.eventType}". ` +
      `Only ${SMS_ELIGIBLE_EVENT_TYPES.join(", ")} are allowed. ` +
      `See CHARTWELL_SMS_INTEGRATION_SPEC.md Section 6.`
    )
  }

  try {
    const settings = await getSmsSettings()
    if (!settings) {
      await logSms(opts, "FAILED", "unknown", undefined, "SMS not configured")
      return { sent: false, error: "SMS not configured" }
    }

    const route = getProvider(settings, opts.toPhone)
    if (!route) {
      const isIndia = isIndiaNumber(opts.toPhone)
      const err = isIndia
        ? "India SMS provider not configured"
        : "International SMS provider not configured"
      await logSms(opts, "FAILED", "unknown", undefined, err)
      return { sent: false, error: err }
    }

    const templateId = opts.eventType === "OTP_VERIFICATION"
      ? route.templateIdOtp
      : route.templateIdConfirmation

    // India sends REQUIRE a DLT template ID — enforce here
    if (isIndiaNumber(opts.toPhone) && !templateId) {
      const err = `DLT template ID not configured for ${opts.eventType}. See BUILD_LOG.md Step 8.`
      await logSms(opts, "FAILED", route.providerName, undefined, err)
      return { sent: false, error: err }
    }

    const result = await route.provider.send({
      to: opts.toPhone,
      templateId,
      variables: opts.variables,
    })

    await logSms(opts, "SENT", route.providerName, result.messageId)
    return { sent: true, providerMessageId: result.messageId, provider: route.providerName }
  } catch (err: any) {
    const errMsg = err?.message || "Unknown SMS error"
    try {
      await logSms(opts, "FAILED", "unknown", undefined, errMsg)
    } catch {
      // swallow secondary failure
    }
    return { sent: false, error: errMsg }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────────────────────────────────────

async function logSms(
  opts: SendSmsOptions,
  status: "SENT" | "FAILED",
  provider: string,
  providerMessageId?: string,
  errorMessage?: string
) {
  await db.smsMessageLog.create({
    data: {
      clinicId: opts.clinicId ?? null,
      patientId: opts.patientId ?? null,
      appointmentId: opts.appointmentId ?? null,
      userId: opts.userId ?? null,
      toPhone: opts.toPhone,
      eventType: opts.eventType,
      provider,
      status,
      providerMessageId: providerMessageId ?? null,
      errorMessage: errorMessage ?? null,
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Test connection helpers (used by admin settings actions)
// ─────────────────────────────────────────────────────────────────────────────

export async function testSmsConnectionIndia(): Promise<{ success: boolean; error?: string; displayInfo?: string }> {
  const settings = await getSmsSettings()
  if (!settings?.smsApiKeyIndia || !settings?.smsSenderIdIndia) {
    return { success: false, error: "API Key and Sender ID are required" }
  }

  try {
    // MSG91: fetch balance/account info to verify credentials
    const response = await fetch("https://api.msg91.com/api/v5/balance", {
      headers: { authkey: settings.smsApiKeyIndia },
    })
    const data = await response.json() as any
    if (data.type === "error") {
      return { success: false, error: data.message || "Invalid credentials" }
    }
    return { success: true, displayInfo: `Sender: ${settings.smsSenderIdIndia}` }
  } catch (err: any) {
    return { success: false, error: err.message || "Connection test failed" }
  }
}

export async function testSmsConnectionInternational(): Promise<{ success: boolean; error?: string; displayInfo?: string }> {
  const settings = await getSmsSettings()
  if (!settings?.smsAccountSidInternational || !settings?.smsAuthTokenInternational) {
    return { success: false, error: "Account SID and Auth Token are required" }
  }

  try {
    const credentials = Buffer.from(
      `${settings.smsAccountSidInternational}:${settings.smsAuthTokenInternational}`
    ).toString("base64")

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${settings.smsAccountSidInternational}.json`,
      { headers: { Authorization: `Basic ${credentials}` } }
    )
    const data = await response.json() as any
    if (data.status === 401 || data.code === 20003) {
      return { success: false, error: "Invalid Account SID or Auth Token" }
    }
    if (!response.ok) {
      return { success: false, error: data.message || `HTTP ${response.status}` }
    }
    return {
      success: true,
      displayInfo: `Account: ${data.friendly_name || settings.smsAccountSidInternational}`,
    }
  } catch (err: any) {
    return { success: false, error: err.message || "Connection test failed" }
  }
}
