/**
 * Structured logger utility — CHARTWELL_PRELAUNCH_OPS_SPEC.md §1.1
 *
 * RULES:
 * - Never log PHI: no patient names, diagnoses, prescriptions, notes, phone numbers.
 * - All log lines go through this module — no scattered console.log.
 * - Each request should pass a requestId (from X-Request-ID header or nanoid()) so
 *   multiple log lines for the same request can be correlated.
 * - Environment tag is always included so dev/staging noise is filterable.
 *
 * Usage:
 *   import { logger } from "@/lib/logger"
 *   logger.info("Appointment created", { clinicId, appointmentId })
 *   logger.warn("Payment webhook late", { clinicId, delayMs })
 *   logger.error("Stripe webhook failed", error, { clinicId })
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogContext {
  requestId?: string
  clinicId?: string
  userId?: string
  patientAccountId?: string
  /** Any other non-PHI metadata */
  [key: string]: unknown
}

// PHI field names that must never be logged
const PHI_LOG_KEYS = new Set([
  "diagnosis",
  "prescription",
  "notes",
  "allergies",
  "condition",
  "bloodGroup",
  "medication",
  "drug",
  "dosage",
  "labResult",
  "patientName",
  "dob",
  "dateOfBirth",
  "ssn",
  "nhi",
  "insurance",
  "passwordHash",
  "password",
  "codeHash",
])

function sanitizeContext(ctx: LogContext): LogContext {
  const clean: LogContext = {}
  for (const [k, v] of Object.entries(ctx)) {
    if (PHI_LOG_KEYS.has(k)) {
      clean[k] = "[REDACTED]"
    } else if (v && typeof v === "object") {
      if (Array.isArray(v)) {
        clean[k] = v.map((item) => 
          (item && typeof item === "object") ? sanitizeContext(item as LogContext) : item
        )
      } else {
        clean[k] = sanitizeContext(v as LogContext)
      }
    } else {
      clean[k] = v
    }
  }
  return clean
}

function formatLog(level: LogLevel, message: string, ctx?: LogContext, err?: unknown): string {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    env: process.env.NODE_ENV || "development",
    msg: message,
    ...(ctx ? sanitizeContext(ctx) : {}),
  }

  if (err instanceof Error) {
    entry.error = {
      name: err.name,
      message: err.message,
      // Stack trace is safe — it points to code, not PHI
      stack: process.env.NODE_ENV !== "production" ? err.stack : err.stack?.split("\n").slice(0, 5).join("\n"),
    }
  } else if (err !== undefined) {
    entry.error = String(err)
  }

  return JSON.stringify(entry)
}

export const logger = {
  debug(message: string, ctx?: LogContext) {
    if (process.env.NODE_ENV === "development") {
      console.debug(formatLog("debug", message, ctx))
    }
  },

  info(message: string, ctx?: LogContext) {
    console.log(formatLog("info", message, ctx))
  },

  warn(message: string, ctx?: LogContext, err?: unknown) {
    console.warn(formatLog("warn", message, ctx, err))
  },

  error(message: string, err?: unknown, ctx?: LogContext) {
    console.error(formatLog("error", message, ctx, err))
  },
}

/**
 * Generate a short request ID for correlating log lines within one request.
 * Use in middleware or the top of an API route handler.
 */
export function generateRequestId(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}
