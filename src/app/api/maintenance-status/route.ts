import { db } from "@/lib/db"
import { NextResponse } from "next/server"

/**
 * /api/maintenance-status — internal endpoint polled by middleware.ts
 *
 * Returns the current MAINTENANCE_MODE flag value along with any
 * admin-configured message and ETA text.
 *
 * This endpoint is exempt from maintenance mode itself (see middleware.ts).
 * It is NOT intended for public consumption — it should only be called by
 * the Edge middleware from within the same deployment.
 *
 * Response schema:
 *   { enabled: boolean, message: string, etaText: string }
 */
export async function GET() {
  try {
    const flag = await db.platformFlag.findUnique({
      where: { key: "MAINTENANCE_MODE" },
    })

    // Read optional message/eta from GlobalSettings (editable from Feature Flags panel)
    const [msgSetting, etaSetting] = await Promise.all([
      db.globalSetting.findUnique({ where: { key: "MAINTENANCE_MESSAGE" } }).catch(() => null),
      db.globalSetting.findUnique({ where: { key: "MAINTENANCE_ETA_TEXT" } }).catch(() => null),
    ])

    return NextResponse.json({
      enabled: flag?.enabled ?? false,
      message: msgSetting?.value ?? "",
      etaText: etaSetting?.value ?? "",
    })
  } catch {
    // If DB is unreachable, fail open — don't block traffic
    return NextResponse.json({ enabled: false, message: "", etaText: "" })
  }
}
