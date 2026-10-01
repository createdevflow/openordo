/**
 * Sentry client-side config — CHARTWELL_PRELAUNCH_OPS_SPEC.md §1.1–1.2
 *
 * CRITICAL: beforeSend scrubs all PHI field names before any event is transmitted
 * to the Sentry service.  This is the structural enforcement of the no-PHI-in-error-
 * reports rule — not a writing guideline that could be skipped by accident.
 */
import * as Sentry from "@sentry/nextjs"

// Fields that must NEVER appear in an error report payload
const PHI_FIELDS = new Set([
  "diagnosis",
  "prescription",
  "notes",
  "allergies",
  "condition",
  "bloodGroup",
  "blood_group",
  "medical_notes",
  "clinicalNotes",
  "clinical_notes",
  "medications",
  "medication",
  "drug",
  "dosage",
  "frequency",
  "labResult",
  "lab_result",
  "patientName",
  "patient_name",
  "dob",
  "dateOfBirth",
  "date_of_birth",
  "ssn",
  "nhi",
  "insurance",
  "address",
  "phone",
  "email",
  "name",
])

/** Recursively strip PHI keys from any object */
function scrubPhiFromObject(obj: unknown, depth = 0): unknown {
  if (depth > 10 || obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map((item) => scrubPhiFromObject(item, depth + 1))
  if (typeof obj === "object") {
    const cleaned: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (PHI_FIELDS.has(key.toLowerCase()) || PHI_FIELDS.has(key)) {
        cleaned[key] = "[REDACTED]"
      } else {
        cleaned[key] = scrubPhiFromObject(val, depth + 1)
      }
    }
    return cleaned
  }
  return obj
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Only trace a fraction of requests to keep quota low; increase after validating
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Only replay sessions when errors occur
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,

  // Do not send events in dev unless DSN is explicitly set
  enabled: process.env.NODE_ENV === "production" || !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  beforeSend(event) {
    // Strip PHI from request body, extra, and contexts before transmitting
    if (event.request?.data) {
      event.request.data = scrubPhiFromObject(event.request.data)
    }
    if (event.extra) {
      event.extra = scrubPhiFromObject(event.extra) as Record<string, unknown>
    }
    if (event.contexts) {
      event.contexts = scrubPhiFromObject(event.contexts) as any
    }
    // Strip any breadcrumb data that might contain PHI
    if (Array.isArray(event.breadcrumbs)) {
      event.breadcrumbs = event.breadcrumbs.map((crumb: any) => ({
        ...crumb,
        data: crumb.data ? scrubPhiFromObject(crumb.data) as Record<string, unknown> : crumb.data,
        message: crumb.message?.replace(/"(diagnosis|prescription|notes|allergies|condition|bloodGroup|phone|email|dob|ssn)":\s*"[^"]*"/gi, `"$1":"[REDACTED]"`),
      }))
    }
    return event
  },

  beforeSendTransaction(event) {
    // Strip PHI from transaction spans
    if (event.extra) {
      event.extra = scrubPhiFromObject(event.extra) as Record<string, unknown>
    }
    return event
  },
})
