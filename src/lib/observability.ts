import { db } from "@/lib/db"

/**
 * Internal Error capturing utility.
 * Replaces Sentry capturing.
 * 
 * IMPORTANT: No PHI (Patient Health Information) should ever be passed to this function.
 * All metadata MUST be sanitized before calling this.
 */

type LogLevel = "ERROR" | "WARN" | "INFO"
type LogSource = "CLIENT" | "SERVER" | "EDGE"

interface CaptureContext {
  source?: LogSource
  url?: string
  userId?: string
  clinicId?: string
  metadata?: Record<string, any>
}

export async function captureError(error: unknown, context: CaptureContext = {}) {
  try {
    let message = "Unknown error"
    let stack = undefined

    if (error instanceof Error) {
      message = error.message
      stack = error.stack
    } else if (typeof error === "string") {
      message = error
    } else {
      message = JSON.stringify(error)
    }

    // Server-side database insert
    if (typeof window === "undefined") {
      await db.systemErrorLog.create({
        data: {
          level: "ERROR",
          source: context.source || "SERVER",
          message,
          stack,
          url: context.url,
          userId: context.userId,
          clinicId: context.clinicId,
          metadata: context.metadata ? JSON.stringify(context.metadata) : null,
        },
      })
    } else {
      // Client-side forward to API
      fetch("/api/observability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: "ERROR",
          source: context.source || "CLIENT",
          message,
          stack,
          url: window.location.href,
          userId: context.userId,
          clinicId: context.clinicId,
          metadata: context.metadata,
        }),
      }).catch(console.error) // Silent fail on the client
    }
  } catch (err) {
    // Failsafe so the application doesn't crash if logging fails
    console.error("Failed to capture error internally:", err)
  }
}
