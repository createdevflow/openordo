import { db } from "@/lib/db"
import { NextResponse } from "next/server"

// Vercel cron endpoints should be protected via headers if exposed, 
// but for this build we'll assume basic protection or network isolation.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    // Basic protection against random hits
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date()

    // 1. Find the default free plan
    const defaultFreePlan = await db.plan.findFirst({
      where: { isDefaultFree: true }
    })

    if (!defaultFreePlan) {
      console.error("No default free plan configured")
      return NextResponse.json({ error: "No default free plan configured" }, { status: 500 })
    }

    // 2. Find subscriptions where promoExpiresAt < now
    const expiredSubscriptions = await db.subscription.findMany({
      where: {
        promoId: { not: null },
        promoExpiresAt: { lt: now },
        status: "ACTIVE"
      }
    })

    console.log(`Found ${expiredSubscriptions.length} expired promo subscriptions`)

    let downgraded = 0
    for (const sub of expiredSubscriptions) {
      // Downgrade to default free plan
      await db.subscription.update({
        where: { id: sub.id },
        data: {
          planId: defaultFreePlan.id,
          promoId: null,
          promoExpiresAt: null
        }
      })
      
      // We would send an email here
      console.log(`Downgraded clinic ${sub.clinicId} to ${defaultFreePlan.name}`)
      downgraded++
    }

    return NextResponse.json({ ok: true, downgraded })
  } catch (error: any) {
    console.error("Cron failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
