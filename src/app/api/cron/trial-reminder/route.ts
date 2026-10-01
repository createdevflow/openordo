import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { sendNotificationEmail } from "@/lib/notifications/send"
import { renderTrialEndingSoon } from "@/lib/notifications/templates"

// Run daily. Finds trials ending in 1 or 3 days and sends reminder emails.
// Per spec §2.3: send at 3 days AND 1 day before conversion.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const APP = process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"

    // Run for both 3-day and 1-day windows
    const windows = [
      { daysLeft: 3, start: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000), end: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000) },
      { daysLeft: 1, start: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000), end: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000) },
    ]

    let totalSent = 0

    for (const window of windows) {
      const subs = await db.subscription.findMany({
        where: {
          status: "TRIALING",
          trialEndsAt: { gte: window.start, lte: window.end },
        },
        include: {
          plan: true,
          clinic: {
            include: {
              memberships: {
                where: { role: "OWNER" },
                include: { user: { select: { id: true, email: true, name: true } } },
                take: 1,
              },
            },
          },
        },
      })

      console.log(`[trial-reminder] ${window.daysLeft}d window: ${subs.length} trials found`)

      for (const sub of subs) {
        const owner = sub.clinic.memberships[0]?.user
        if (!owner?.email) continue

        const chargeDate = sub.trialEndsAt!.toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric",
        })
        const price = sub.plan.priceMonthlyUsd > 0
          ? `$${sub.plan.priceMonthlyUsd}/mo`
          : `₹${sub.plan.priceMonthlyInr}/mo`

        const result = await sendNotificationEmail(
          "TRIAL_ENDING_SOON",
          { toEmail: owner.email, ownerType: "USER", ownerId: owner.id, clinicId: sub.clinicId },
          renderTrialEndingSoon({
            name:       owner.name,
            planName:   sub.plan.name,
            daysLeft:   window.daysLeft,
            chargeDate,
            price,
            settingsUrl: `${APP}/dashboard/settings?tab=subscription`,
          })
        )
        if (result.sent) totalSent++
      }
    }

    return NextResponse.json({ ok: true, sent: totalSent })
  } catch (error: any) {
    console.error("trial-reminder cron failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
