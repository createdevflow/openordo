/**
 * Sentry server-side config — CHARTWELL_PRELAUNCH_OPS_SPEC.md §1.1–1.2
 *
 * CRITICAL: Same PHI-scrubbing beforeSend hook as client config.
 * Server events can carry request bodies — these must be stripped before
 * they ever leave the server process.
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
  "passwordHash",
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
])

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
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  enabled: process.env.NODE_ENV === "production" || !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),

  beforeSend(event) {
    // Strip request body — can contain patient form submissions
    if (event.request?.data) {
      event.request.data = scrubPhiFromObject(event.request.data)
    }
    // Strip query string params that might contain IDs leaked to error context
    if (event.request?.query_string) {
      // Keep query string structure but remove values we don't need
      if (typeof event.request.query_string === "string") {
        event.request.query_string = event.request.query_string.replace(/=([\w%-]{20,})/g, "=[REDACTED]")
      }
    }
    if (event.extra) {
      event.extra = scrubPhiFromObject(event.extra) as Record<string, unknown>
    }
    if (event.contexts) {
      event.contexts = scrubPhiFromObject(event.contexts) as any
    }
    if (Array.isArray(event.breadcrumbs)) {
      event.breadcrumbs = event.breadcrumbs.map((crumb: any) => ({
        ...crumb,
        data: crumb.data ? scrubPhiFromObject(crumb.data) as Record<string, unknown> : crumb.data,
        message: crumb.message?.replace(/"(diagnosis|prescription|notes|allergies|condition|phone|email|password|token)":\s*"[^"]*"/gi, `"$1":"[REDACTED]"`),
      }))
    }
    return event
  },

  beforeSendTransaction(event) {
    if (event.extra) {
      event.extra = scrubPhiFromObject(event.extra) as Record<string, unknown>
    }
    return event
  },
})
