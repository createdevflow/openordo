/**
 * Sentry Edge runtime config — CHARTWELL_PRELAUNCH_OPS_SPEC.md §1.1–1.2
 * Same PHI scrubbing as server config; edge has a smaller API surface.
 */
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  enabled: process.env.NODE_ENV === "production" || !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),

  beforeSend(event) {
    if (event.request?.data) {
      // Edge: data is typically a string body — redact common PHI JSON patterns
      if (typeof event.request.data === "string") {
        event.request.data = event.request.data.replace(
          /"(diagnosis|prescription|notes|allergies|condition|phone|email|password|token|bloodGroup)":\s*"[^"]*"/gi,
          `"$1":"[REDACTED]"`
        )
      }
    }
    return event
  },
})
