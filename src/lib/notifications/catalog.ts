/**
 * EMAIL_EVENTS catalog — CHARTWELL_EMAIL_NOTIFICATIONS_SPEC.md §3.1
 *
 * This is a FIXED, in-code list.  sendNotificationEmail() rejects any event
 * type that is not present here, so a future feature cannot invent an
 * unreviewed event type on the fly.
 *
 * mandatory: true  → sends unconditionally, NotificationPreference is never checked.
 * mandatory: false → toggleable, preference checked before send.
 *
 * recipientType: "STAFF" | "PATIENT" | "ADMIN" | "LEAD"
 */

export type EventKey = keyof typeof EMAIL_EVENTS

export const EMAIL_EVENTS = {
  // ── 2.1 Account & onboarding (staff) ───────────────────────────────────────
  WELCOME:                     { mandatory: true,  recipientType: "STAFF"   as const },
  EMAIL_VERIFICATION_OTP:      { mandatory: true,  recipientType: "STAFF"   as const },
  ONBOARDING_REMINDER:         { mandatory: false, recipientType: "STAFF"   as const },
  ONBOARDING_COMPLETE:         { mandatory: false, recipientType: "STAFF"   as const },
  PASSWORD_RESET_LINK:         { mandatory: true,  recipientType: "STAFF"   as const },
  PASSWORD_CHANGED:            { mandatory: true,  recipientType: "STAFF"   as const },
  EMAIL_OR_PHONE_CHANGED:      { mandatory: true,  recipientType: "STAFF"   as const },
  NEW_DEVICE_LOGIN:            { mandatory: true,  recipientType: "STAFF"   as const },
  ACCOUNT_STATUS_CHANGED:      { mandatory: true,  recipientType: "STAFF"   as const },
  ACCOUNT_DELETION_CONFIRMED:  { mandatory: true,  recipientType: "STAFF"   as const },

  // ── 2.2 Team management ────────────────────────────────────────────────────
  CLINIC_INVITE:               { mandatory: true,  recipientType: "STAFF"   as const },
  INVITE_ACCEPTED:             { mandatory: false, recipientType: "STAFF"   as const },
  ROLE_CHANGED_OR_REMOVED:     { mandatory: true,  recipientType: "STAFF"   as const },
  OWNERSHIP_TRANSFER:          { mandatory: true,  recipientType: "STAFF"   as const },

  // ── 2.3 Trial, subscription & billing ──────────────────────────────────────
  TRIAL_STARTED:               { mandatory: true,  recipientType: "STAFF"   as const },
  TRIAL_ENDING_SOON:           { mandatory: true,  recipientType: "STAFF"   as const },
  TRIAL_CONVERTED:             { mandatory: true,  recipientType: "STAFF"   as const },
  PAYMENT_RECEIPT:             { mandatory: true,  recipientType: "STAFF"   as const },
  PAYMENT_FAILED:              { mandatory: true,  recipientType: "STAFF"   as const },
  GRACE_PERIOD_FINAL_NOTICE:   { mandatory: true,  recipientType: "STAFF"   as const },
  PLAN_CHANGED:                { mandatory: true,  recipientType: "STAFF"   as const },
  SUBSCRIPTION_CANCELED:       { mandatory: true,  recipientType: "STAFF"   as const },
  SUBSCRIPTION_ENDED:          { mandatory: true,  recipientType: "STAFF"   as const },
  RENEWAL_REMINDER:            { mandatory: false, recipientType: "STAFF"   as const },
  PRICE_CHANGE_NOTICE:         { mandatory: true,  recipientType: "STAFF"   as const },
  PAYMENT_METHOD_EXPIRING:     { mandatory: true,  recipientType: "STAFF"   as const },
  PAYMENT_METHOD_UPDATED:      { mandatory: true,  recipientType: "STAFF"   as const },
  REFUND_PROCESSED:            { mandatory: true,  recipientType: "STAFF"   as const },
  PROMO_LIFECYCLE:             { mandatory: true,  recipientType: "STAFF"   as const },

  // ── 2.4 Add-ons & usage limits ─────────────────────────────────────────────
  ADDON_ACTIVATED:             { mandatory: true,  recipientType: "STAFF"   as const },
  ADDON_RENEWAL_REMINDER:      { mandatory: false, recipientType: "STAFF"   as const },
  ADDON_RENEWAL_FAILED:        { mandatory: true,  recipientType: "STAFF"   as const },
  ADDON_CANCELED_OR_EXPIRED:   { mandatory: true,  recipientType: "STAFF"   as const },
  ADDON_ADMIN_GRANTED:         { mandatory: true,  recipientType: "STAFF"   as const },
  USAGE_LIMIT_WARNING:         { mandatory: false, recipientType: "STAFF"   as const },
  USAGE_LIMIT_REACHED:         { mandatory: true,  recipientType: "STAFF"   as const },

  // ── 2.5 Compliance & data ──────────────────────────────────────────────────
  BAA_REQUEST_RECEIVED:        { mandatory: true,  recipientType: "STAFF"   as const },
  BAA_APPROVED:                { mandatory: true,  recipientType: "STAFF"   as const },
  BAA_REJECTED:                { mandatory: true,  recipientType: "STAFF"   as const },
  DATA_EXPORT_READY:           { mandatory: true,  recipientType: "STAFF"   as const },
  DATA_DELETION_WARNING:       { mandatory: true,  recipientType: "STAFF"   as const },
  LEGAL_TERMS_UPDATE:          { mandatory: true,  recipientType: "STAFF"   as const },
  SUBPROCESSOR_NOTICE:         { mandatory: true,  recipientType: "STAFF"   as const },
  SECURITY_INCIDENT_NOTICE:    { mandatory: true,  recipientType: "STAFF"   as const },

  // ── 2.6 Clinic operations (staff/doctors) ──────────────────────────────────
  NEW_BOOKING_RECEIVED:        { mandatory: false, recipientType: "STAFF"   as const },
  PATIENT_CANCELED_OR_RESCHEDULED: { mandatory: false, recipientType: "STAFF" as const },
  DOCTOR_DAILY_DIGEST:         { mandatory: false, recipientType: "STAFF"   as const },
  STAFF_APPOINTMENT_REMINDER:  { mandatory: false, recipientType: "STAFF"   as const },
  OVERDUE_INVOICE_ALERT:       { mandatory: false, recipientType: "STAFF"   as const },
  LOW_STOCK_ALERT:             { mandatory: false, recipientType: "STAFF"   as const },
  PATIENT_WAITING_IN_LOBBY:    { mandatory: false, recipientType: "STAFF"   as const },
  WEEKLY_CLINIC_SUMMARY:       { mandatory: false, recipientType: "STAFF"   as const },

  // ── 2.7 Patients (sent using that clinic's name/branding only) ─────────────
  PORTAL_ACCOUNT_CREATED:      { mandatory: true,  recipientType: "PATIENT" as const },
  PATIENT_LOGIN_CODE:          { mandatory: true,  recipientType: "PATIENT" as const },
  PATIENT_PASSWORD_SET:        { mandatory: true,  recipientType: "PATIENT" as const },
  BOOKING_REQUEST_RECEIVED:    { mandatory: true,  recipientType: "PATIENT" as const },
  APPOINTMENT_CONFIRMED:       { mandatory: true,  recipientType: "PATIENT" as const },
  APPOINTMENT_REMINDER:        { mandatory: false, recipientType: "PATIENT" as const },
  APPOINTMENT_CHANGED_BY_CLINIC: { mandatory: true, recipientType: "PATIENT" as const },
  VIDEO_CONSULT_LINK:          { mandatory: true,  recipientType: "PATIENT" as const },
  INVOICE_EVENT:               { mandatory: true,  recipientType: "PATIENT" as const },
  PRESCRIPTION_ISSUED:         { mandatory: false, recipientType: "PATIENT" as const },
  RECORD_SHARED:               { mandatory: false, recipientType: "PATIENT" as const },
  MISSED_APPOINTMENT:          { mandatory: false, recipientType: "PATIENT" as const },
  PATIENT_CONTACT_CHANGED:     { mandatory: true,  recipientType: "PATIENT" as const },

  // ── 2.8 Platform admin (internal alerts) ───────────────────────────────────
  NEW_CLINIC_SIGNUP:           { mandatory: true,  recipientType: "ADMIN"   as const },
  NEW_LEAD:                    { mandatory: true,  recipientType: "ADMIN"   as const },
  NEW_BAA_REQUEST_PENDING:     { mandatory: true,  recipientType: "ADMIN"   as const },
  BILLING_EVENT_ALERT:         { mandatory: true,  recipientType: "ADMIN"   as const },
  INTEGRATION_FAILURE:         { mandatory: true,  recipientType: "ADMIN"   as const },
  BACKUP_RESULT:               { mandatory: true,  recipientType: "ADMIN"   as const },
  SECURITY_EVENT:              { mandatory: true,  recipientType: "ADMIN"   as const },
  PROMO_LIMIT_REACHED:         { mandatory: true,  recipientType: "ADMIN"   as const },
} as const

export type RecipientType = (typeof EMAIL_EVENTS)[EventKey]["recipientType"]
