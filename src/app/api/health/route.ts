import { db } from "@/lib/db"
import { NextResponse } from "next/server"

/**
 * /api/health — CHARTWELL_PRELAUNCH_OPS_SPEC.md §1.1
 *
 * Returns 200 when the database is reachable, 503 otherwise.
 * This endpoint is exempt from authentication so external uptime services
 * (UptimeRobot, Better Uptime) can poll it without credentials.
 *
 * Response schema:
 *   { status: "ok" | "degraded", db: "connected" | "error", ts: ISO string }
 *
 * External monitoring setup (document in BUILD_LOG):
 *   1. Add a new monitor in UptimeRobot / Better Uptime pointing to
 *      https://yourdomain.com/api/health
 *   2. Set check interval: 1–5 minutes
 *   3. Alert channels: email + SMS (or Slack) for immediate notification
 *   4. Expected status: 200 with body containing "ok"
 */
export async function GET() {
  const ts = new Date().toISOString()

  try {
    // Lightweight DB liveness probe — a single raw query with 5s timeout
    await db.$queryRaw`SELECT 1`

    return NextResponse.json(
      { status: "ok", db: "connected", ts },
      { status: 200 }
    )
  } catch (err) {
    console.error("[HEALTH] Database connectivity check failed:", err)

    return NextResponse.json(
      { status: "degraded", db: "error", ts },
      { status: 503 }
    )
  }
}
