import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()

    const defaultFreePlan = await db.plan.findFirst({ where: { isDefaultFree: true } })
    if (!defaultFreePlan) {
      console.error("No default free plan configured")
      return NextResponse.json({ error: "No default free plan configured" }, { status: 500 })
    }

    // 1. Downgrade expired promo subscriptions
    const expiredPromos = await db.subscription.findMany({
      where: {
        promoId: { not: null },
        promoExpiresAt: { lt: now },
        status: "ACTIVE"
      }
    })
    console.log(`Found ${expiredPromos.length} expired promo subscriptions`)

    let downgraded = 0
    for (const sub of expiredPromos) {
      await db.subscription.update({
        where: { id: sub.id },
        data: {
          planId: defaultFreePlan.id,
          promoId: null,
          promoExpiresAt: null
        }
      })
      console.log(`Downgraded clinic ${sub.clinicId} (promo expired) to ${defaultFreePlan.name}`)
      downgraded++
    }

    // 2. Downgrade expired trials that have no active Stripe subscription (no payment method was added)
    const expiredTrials = await db.subscription.findMany({
      where: {
        status: "TRIALING",
        trialEndsAt: { lt: now },
        razorpaySubscriptionId: null,  // No Razorpay subscription = no payment set up
      }
    })
    console.log(`Found ${expiredTrials.length} expired trials without payment method`)

    let trialDowngraded = 0
    for (const sub of expiredTrials) {
      await db.clinic.update({
        where: { id: sub.clinicId },
        data: {
          status: "LOCKED_CANCELLED",
          lockedAt: now,
        }
      })
      await db.subscription.update({
        where: { id: sub.id },
        data: {
          status: "CANCELED",
          trialEndsAt: null,
        }
      })
      console.log(`Locked clinic ${sub.clinicId} (trial expired, no payment)`)
      trialDowngraded++
    }

    // 3. Downgrade cancelled subscriptions where the period has now ended (cancelAtPeriodEnd=true)
    const cancelledPeriodEnded = await db.subscription.findMany({
      where: {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: { lt: now },
        razorpaySubscriptionId: null,  // If Razorpay is set, it handles this via webhook
      }
    })
    console.log(`Found ${cancelledPeriodEnded.length} cancelled subscriptions past period end`)

    let cancelDowngraded = 0
    for (const sub of cancelledPeriodEnded) {
      await db.clinic.update({
        where: { id: sub.clinicId },
        data: {
          status: "LOCKED_CANCELLED",
          lockedAt: now,
        }
      })
      await db.subscription.update({
        where: { id: sub.id },
        data: {
          status: "CANCELED",
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
        }
      })
      console.log(`Locked clinic ${sub.clinicId} (cancelled, period ended)`)
      cancelDowngraded++
    }

    return NextResponse.json({ ok: true, downgraded, trialDowngraded, cancelDowngraded })
  } catch (error: any) {
    console.error("Cron failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
