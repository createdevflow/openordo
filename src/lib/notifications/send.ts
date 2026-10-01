/**
 * sendNotificationEmail — the ONE path any email goes through.
 * CHARTWELL_EMAIL_NOTIFICATIONS_SPEC.md §1.3, §3.2
 *
 * Rules enforced here (not left to convention):
 *
 * 1. Event type must be present in EMAIL_EVENTS catalog — unknown types are rejected.
 * 2. MANDATORY events send unconditionally — NotificationPreference is never even queried.
 * 3. TOGGLEABLE events: NotificationPreference is checked first; disabled = "SKIPPED" log entry, no send.
 * 4. Every send (or skip) is logged to EmailLog for audit / debugging.
 * 5. Uses the project's existing SMTP/nodemailer transport from lib/email.ts.
 *
 * HARD CONSTRAINT: No code outside this module may call the SMTP transport directly
 * for any event type listed in EMAIL_EVENTS.
 */

import nodemailer from "nodemailer"
import { db } from "@/lib/db"
import { decrypt } from "@/lib/crypto"
import { EMAIL_EVENTS, type EventKey } from "./catalog"
import type { RenderedEmail } from "./templates"

// ─── SMTP transport (mirrors lib/email.ts getSmtpConfig) ─────────────────────

async function getSmtpConfig() {
  const settings = await db.globalSetting.findMany({
    where: {
      key: {
        in: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "SMTP_FROM_AUTH", "SMTP_FROM_BILLING", "SMTP_FROM_GENERAL"],
      },
    },
  })

  const cfg: Record<string, string> = {}
  for (const s of settings) cfg[s.key] = s.value

  return {
    host:        (cfg.SMTP_HOST  || process.env.SMTP_HOST  || "").trim(),
    port:        parseInt((cfg.SMTP_PORT || process.env.SMTP_PORT || "587").trim(), 10),
    user:        (cfg.SMTP_USER  || process.env.SMTP_USER  || "").trim(),
    pass:        (cfg.SMTP_PASS  ? decrypt(cfg.SMTP_PASS) : (process.env.SMTP_PASS || "")).trim(),
    from:        (cfg.SMTP_FROM  || process.env.SMTP_FROM  || "OpenORDO <noreply@openordo.com>").trim(),
    fromAuth:    (cfg.SMTP_FROM_AUTH    || "").trim(),
    fromBilling: (cfg.SMTP_FROM_BILLING || "").trim(),
    fromGeneral: (cfg.SMTP_FROM_GENERAL || "").trim(),
  }
}

type Category = "auth" | "billing" | "general"

function getFromAddress(category: Category, cfg: Awaited<ReturnType<typeof getSmtpConfig>>): string {
  const AUTH_EVENTS    = new Set<EventKey>(["EMAIL_VERIFICATION_OTP", "PASSWORD_RESET_LINK", "PASSWORD_CHANGED", "EMAIL_OR_PHONE_CHANGED", "NEW_DEVICE_LOGIN", "PATIENT_LOGIN_CODE", "PATIENT_PASSWORD_SET", "ACCOUNT_DELETION_CONFIRMED", "ACCOUNT_STATUS_CHANGED", "SECURITY_EVENT", "PATIENT_CONTACT_CHANGED"])
  const BILLING_EVENTS = new Set<EventKey>(["PAYMENT_RECEIPT", "PAYMENT_FAILED", "GRACE_PERIOD_FINAL_NOTICE", "PLAN_CHANGED", "SUBSCRIPTION_CANCELED", "SUBSCRIPTION_ENDED", "TRIAL_STARTED", "TRIAL_ENDING_SOON", "TRIAL_CONVERTED", "RENEWAL_REMINDER", "PRICE_CHANGE_NOTICE", "PAYMENT_METHOD_EXPIRING", "PAYMENT_METHOD_UPDATED", "REFUND_PROCESSED", "PROMO_LIFECYCLE", "ADDON_ACTIVATED", "ADDON_RENEWAL_FAILED", "ADDON_CANCELED_OR_EXPIRED", "ADDON_ADMIN_GRANTED", "USAGE_LIMIT_REACHED", "BILLING_EVENT_ALERT", "INVOICE_EVENT"])

  let addr = cfg.from
  if (category === "auth"    && cfg.fromAuth)    addr = cfg.fromAuth
  if (category === "billing" && cfg.fromBilling) addr = cfg.fromBilling
  if (category === "general" && cfg.fromGeneral) addr = cfg.fromGeneral
  if (!addr.includes("@")) addr = `${addr} <noreply@openordo.com>`
  return addr
}

function resolveCategory(eventType: EventKey): Category {
  const AUTH_EVENTS    = ["EMAIL_VERIFICATION_OTP","PASSWORD_RESET_LINK","PASSWORD_CHANGED","EMAIL_OR_PHONE_CHANGED","NEW_DEVICE_LOGIN","PATIENT_LOGIN_CODE","PATIENT_PASSWORD_SET","ACCOUNT_DELETION_CONFIRMED","ACCOUNT_STATUS_CHANGED","SECURITY_EVENT","PATIENT_CONTACT_CHANGED","PORTAL_ACCOUNT_CREATED","WELCOME"]
  const BILLING_EVENTS = ["PAYMENT_RECEIPT","PAYMENT_FAILED","GRACE_PERIOD_FINAL_NOTICE","PLAN_CHANGED","SUBSCRIPTION_CANCELED","SUBSCRIPTION_ENDED","TRIAL_STARTED","TRIAL_ENDING_SOON","TRIAL_CONVERTED","RENEWAL_REMINDER","PRICE_CHANGE_NOTICE","PAYMENT_METHOD_EXPIRING","PAYMENT_METHOD_UPDATED","REFUND_PROCESSED","PROMO_LIFECYCLE","ADDON_ACTIVATED","ADDON_RENEWAL_REMINDER","ADDON_RENEWAL_FAILED","ADDON_CANCELED_OR_EXPIRED","ADDON_ADMIN_GRANTED","USAGE_LIMIT_WARNING","USAGE_LIMIT_REACHED","BILLING_EVENT_ALERT","INVOICE_EVENT"]
  if (AUTH_EVENTS.includes(eventType))    return "auth"
  if (BILLING_EVENTS.includes(eventType)) return "billing"
  return "general"
}

// ─── Recipient shape ──────────────────────────────────────────────────────────

export interface EmailRecipient {
  /** Email address to send to */
  toEmail: string
  /** "USER" | "PATIENT_ACCOUNT" | "ADMIN" | "LEAD" */
  ownerType: "USER" | "PATIENT_ACCOUNT" | "ADMIN" | "LEAD"
  /** userId / patientAccountId / null for pre-account leads */
  ownerId?: string | null
  /** clinicId — null for platform-level emails */
  clinicId?: string | null
}

// ─── Main orchestration function ─────────────────────────────────────────────

/**
 * The ONLY entry point for sending notification emails in this system.
 *
 * @param eventType  - Must be a key in EMAIL_EVENTS catalog.
 * @param recipient  - Who to send to, including their owner type and IDs for logging.
 * @param rendered   - Pre-rendered { subject, html } from the templates module.
 */
export async function sendNotificationEmail(
  eventType: EventKey,
  recipient: EmailRecipient,
  rendered: RenderedEmail
): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  // 1. Validate event type (guaranteed by TypeScript, but defensive at runtime too)
  const eventDef = EMAIL_EVENTS[eventType]
  if (!eventDef) {
    const msg = `sendNotificationEmail: unknown event type "${eventType}" — not in EMAIL_EVENTS catalog`
    console.error(msg)
    return { sent: false, error: msg }
  }

  const recipientType = eventDef.recipientType === "STAFF" && (recipient.ownerType === "ADMIN")
    ? "ADMIN"
    : eventDef.recipientType

  // 2. For TOGGLEABLE events, check NotificationPreference
  if (!eventDef.mandatory && recipient.ownerId) {
    const pref = await db.notificationPreference.findUnique({
      where: {
        ownerType_ownerId_eventType: {
          ownerType: recipient.ownerType === "PATIENT_ACCOUNT" ? "PATIENT_ACCOUNT" : "USER",
          ownerId:   recipient.ownerId,
          eventType: eventType,
        },
      },
    })

    // If a preference row exists and is disabled → SKIP
    if (pref && !pref.enabled) {
      await logEmail({
        eventType,
        recipient,
        recipientType,
        subject: rendered.subject,
        status: "SKIPPED",
      })
      return { sent: false, skipped: true }
    }
  }

  // 3. Send via SMTP
  const cfg = await getSmtpConfig()

  if (!cfg.host || !cfg.user || !cfg.pass) {
    // Dev mode: log to console and still record SENT (so triggers fire in dev too)
    console.log("===================================================")
    console.log(`[EMAIL] [${eventType}] To: ${recipient.toEmail}`)
    console.log(`Subject: ${rendered.subject}`)
    console.log("===================================================")
    await logEmail({ eventType, recipient, recipientType, subject: rendered.subject, status: "SENT" })
    return { sent: true }
  }

  try {
    const transporter = nodemailer.createTransport({
      host:   cfg.host,
      port:   cfg.port,
      secure: cfg.port === 465,
      auth:   { user: cfg.user, pass: cfg.pass },
      tls:    { rejectUnauthorized: false },
    })

    const from = getFromAddress(resolveCategory(eventType), cfg)

    const result = await transporter.sendMail({
      from,
      to:      recipient.toEmail,
      subject: rendered.subject,
      html:    rendered.html,
    })

    await logEmail({
      eventType,
      recipient,
      recipientType,
      subject: rendered.subject,
      status: "SENT",
      providerMessageId: result.messageId,
    })

    if (process.env.NODE_ENV !== "production") {
      console.log(`[EMAIL SENT] ${eventType} → ${recipient.toEmail}`)
    }

    return { sent: true }
  } catch (err: any) {
    const errorMessage = err?.message || "Unknown error"
    console.error(`[EMAIL FAILED] ${eventType} → ${recipient.toEmail}:`, errorMessage)

    await logEmail({
      eventType,
      recipient,
      recipientType,
      subject: rendered.subject,
      status: "FAILED",
      errorMessage,
    })

    return { sent: false, error: errorMessage }
  }
}

// ─── Logging helper ───────────────────────────────────────────────────────────

async function logEmail({
  eventType,
  recipient,
  recipientType,
  subject,
  status,
  providerMessageId,
  errorMessage,
}: {
  eventType:          string
  recipient:          EmailRecipient
  recipientType:      string
  subject:            string
  status:             "SENT" | "FAILED" | "BOUNCED" | "SKIPPED"
  providerMessageId?: string
  errorMessage?:      string
}) {
  try {
    await db.emailLog.create({
      data: {
        recipientType,
        recipientId:       recipient.ownerId  || null,
        clinicId:          recipient.clinicId || null,
        eventType,
        toEmail:           recipient.toEmail,
        subject,
        status,
        providerMessageId: providerMessageId || null,
        errorMessage:      errorMessage       || null,
      },
    })
  } catch (logErr) {
    // Logging must never crash the caller
    console.error("[EMAIL LOG FAILED]", logErr)
  }
}
