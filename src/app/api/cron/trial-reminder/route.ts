import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { sendTrialEndingEmail } from "@/lib/email"

// Run daily. Finds trials ending in 2-4 days and sends reminder email.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const windowStart = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)  // 2 days from now
    const windowEnd   = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)  // 4 days from now

    const subs = await db.subscription.findMany({
      where: {
        status: "TRIALING",
        trialEndsAt: { gte: windowStart, lte: windowEnd },
      },
      include: {
        plan: true,
        clinic: {
          include: {
            memberships: {
              where: { role: "OWNER" },
              include: { user: { select: { email: true, name: true } } },
              take: 1
            }
          }
        }
      }
    })

    console.log(`[trial-reminder] Found ${subs.length} trials ending in 2-4 days`)

    let sent = 0
    for (const sub of subs) {
      const owner = sub.clinic.memberships[0]?.user
      if (!owner?.email) continue

      const chargeDate = sub.trialEndsAt!.toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric"
      })

      const isIndia = sub.clinic.memberships[0]?.user !== undefined
      const price = sub.plan.priceMonthlyUsd > 0 ? `$${sub.plan.priceMonthlyUsd}` : `Rs.${sub.plan.priceMonthlyInr}`

      const ok = await sendTrialEndingEmail(owner.email, sub.plan.name, price, chargeDate)
      if (ok) sent++
    }

    return NextResponse.json({ ok: true, sent })
  } catch (error: any) {
    console.error("trial-reminder cron failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
