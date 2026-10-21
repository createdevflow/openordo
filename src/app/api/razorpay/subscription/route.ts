import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require("razorpay")

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { getRazorpayKeyId, getRazorpayKeySecret, isRazorpayBypassMode } = await import("@/lib/razorpay-utils")
  const bypass = await isRazorpayBypassMode()
  const key_id = await getRazorpayKeyId()
  const key_secret = await getRazorpayKeySecret()
  
  if (!bypass && (!key_id || !key_secret)) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 })
  }

  try {
    const { type, itemId, planId: explicitPlanId, quantity = 1, currency: requestedCurrency, billingCycle = "MONTHLY" } = await req.json()
    const clinicId = await requireClinicId()
    const isYearly = String(billingCycle).toUpperCase() === "YEARLY"

    if (bypass) {
      if (type === "PLAN") {
        const existingSub = await db.subscription.findUnique({ where: { clinicId } })
        if (existingSub?.razorpaySubscriptionId && existingSub.status !== "CANCELLED" && existingSub.status !== "INCOMPLETE") {
          await db.subscription.update({
            where: { id: existingSub.id },
            data: { planId: itemId, billingCycle: isYearly ? "yearly" : "monthly" }
          })
          return NextResponse.json({ isUpdate: true, success: true, currency: requestedCurrency || "INR" })
        }
      }
      return NextResponse.json({ bypass: true, success: true, id: "sub_bypass", keyId: "bypass", currency: requestedCurrency || "INR" })
    }

    const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
    const currency: "INR" | "USD" = requestedCurrency === "USD" || requestedCurrency === "INR"
      ? requestedCurrency
      : (clinic?.countryCode === "IN" ? "INR" : "USD")

    const rzp = new Razorpay({ key_id, key_secret })

    let finalPlanId: string | null = null

    if (type === "PLAN") {
      const plan = await db.plan.findUnique({ where: { id: itemId } })
      if (!plan) throw new Error("Plan not found")

      // For INR, look up existing plan ID strictly matching the requested billing cycle
      let existingPlanId = currency === "INR"
        ? (isYearly ? plan.razorpayPlanIdYearly : plan.razorpayPlanIdMonthly)
        : null

      // Guard against client sending mismatched planId (e.g. monthly ID when yearly was toggled)
      if (explicitPlanId) {
        if (isYearly && explicitPlanId === plan.razorpayPlanIdMonthly) {
          // Explicit plan is monthly but user requested yearly - discard it
        } else if (!isYearly && explicitPlanId === plan.razorpayPlanIdYearly) {
          // Explicit plan is yearly but user requested monthly - discard it
        } else if (!existingPlanId) {
          existingPlanId = explicitPlanId
        }
      }

      finalPlanId = existingPlanId

      // Auto-create plan on Razorpay if it doesn't exist or if currency is USD
      if (!finalPlanId || currency === "USD") {
        let amountInSubunits = 0
        if (currency === "INR") {
          const price = isYearly ? (plan.priceYearlyInr || plan.priceMonthlyInr * 12) : plan.priceMonthlyInr
          if (!price || price < 10) {
            throw new Error(`Plan "${plan.name}" has an invalid price (₹${price}).`)
          }
          amountInSubunits = price * 100 // paise
        } else {
          const price = isYearly ? (plan.priceYearlyUsd || plan.priceMonthlyUsd * 12) : plan.priceMonthlyUsd
          if (!price || price < 1) {
            throw new Error(`Plan "${plan.name}" has an invalid price ($${price}).`)
          }
          amountInSubunits = price * 100 // cents
        }

        const newPlan = await rzp.plans.create({
          period: isYearly ? "yearly" : "monthly",
          interval: 1,
          item: {
            name: `Plan: ${plan.name} (${currency}) - ${isYearly ? "Yearly" : "Monthly"}`,
            description: `${isYearly ? "Yearly" : "Monthly"} subscription for ${plan.name}`,
            amount: amountInSubunits,
            currency: currency
          }
        })
        finalPlanId = newPlan.id
        if (currency === "INR") {
          if (isYearly) {
            await db.plan.update({ where: { id: plan.id }, data: { razorpayPlanIdYearly: newPlan.id } })
          } else {
            await db.plan.update({ where: { id: plan.id }, data: { razorpayPlanIdMonthly: newPlan.id } })
          }
        }
      }
    } else if (type === "PLUGIN") {
      const plugin = await db.plugin.findUnique({ where: { id: itemId } })
      if (!plugin) throw new Error("Plugin not found")

      let existingPlanId = currency === "INR"
        ? (isYearly ? plugin.razorpayPlanIdYearly : plugin.razorpayPlanIdMonthly)
        : null

      if (explicitPlanId) {
        if (isYearly && explicitPlanId === plugin.razorpayPlanIdMonthly) {
          // Discard mismatched monthly id
        } else if (!isYearly && explicitPlanId === plugin.razorpayPlanIdYearly) {
          // Discard mismatched yearly id
        } else if (!existingPlanId) {
          existingPlanId = explicitPlanId
        }
      }

      finalPlanId = existingPlanId

      if (!finalPlanId || currency === "USD") {
        let amountInSubunits = 0
        if (currency === "INR") {
          amountInSubunits = isYearly 
            ? (plugin.priceYearlyINR || (plugin.priceMonthlyINR ? plugin.priceMonthlyINR * 12 : 0)) 
            : (plugin.priceMonthlyINR || 0)
        } else {
          amountInSubunits = isYearly 
            ? (plugin.priceYearlyUSD || (plugin.priceMonthlyUSD ? plugin.priceMonthlyUSD * 12 : 0)) 
            : (plugin.priceMonthlyUSD || 0)
        }

        if (!amountInSubunits || amountInSubunits <= 0) {
          throw new Error(`Plugin "${plugin.name}" is missing ${isYearly ? "yearly" : "monthly"} price for ${currency}`)
        }

        const newPlan = await rzp.plans.create({
          period: isYearly ? "yearly" : "monthly",
          interval: 1,
          item: {
            name: `Plugin: ${plugin.name} (${currency}) - ${isYearly ? "Yearly" : "Monthly"}`,
            description: `${isYearly ? "Yearly" : "Monthly"} subscription for ${plugin.name}`,
            amount: amountInSubunits, // already in paise / cents
            currency: currency
          }
        })
        finalPlanId = newPlan.id
        if (currency === "INR") {
          if (isYearly) {
            await db.plugin.update({ where: { id: plugin.id }, data: { razorpayPlanIdYearly: newPlan.id } })
          } else {
            await db.plugin.update({ where: { id: plugin.id }, data: { razorpayPlanIdMonthly: newPlan.id } })
          }
        }
      }
    }

    if (!finalPlanId) {
      throw new Error("Unable to determine Razorpay plan")
    }

    let isUpdate = false
    let subscriptionId = null

    if (type === "PLAN") {
      const existingSub = await db.subscription.findUnique({ where: { clinicId } })
      const existingSubId = existingSub?.razorpaySubscriptionId

      // Only prorate-update if there's a REAL Razorpay subscription ID (not bypass/test values)
      const isRealSub = existingSubId &&
        existingSubId.startsWith("sub_") &&
        existingSub!.status !== "CANCELLED" &&
        existingSub!.status !== "INCOMPLETE"

      if (isRealSub && existingSubId) {
        try {
          const updatedSub = await (rzp.subscriptions.update as any)(existingSubId, {
            plan_id: finalPlanId,
            schedule_change_at: "now"
          })
          await db.subscription.update({
            where: { id: existingSub!.id },
            data: { planId: itemId, billingCycle: isYearly ? "yearly" : "monthly" }
          })
          isUpdate = true
          subscriptionId = updatedSub.id
        } catch (updateErr: any) {
          console.warn("Subscription proration update failed, will create new:", updateErr?.error?.description || updateErr?.message)
        }
      }
    }

    if (!isUpdate) {
      const subscription = await rzp.subscriptions.create({
        plan_id: finalPlanId,
        customer_notify: 1,
        total_count: 1200,
        quantity: quantity,
        notes: { clinicId, type, itemId, currency, billingCycle: isYearly ? "YEARLY" : "MONTHLY" }
      })
      subscriptionId = subscription.id
    }

    return NextResponse.json({ id: subscriptionId, keyId: key_id, isUpdate, currency })
  } catch (err: any) {
    console.error("razorpay subscription error:", JSON.stringify(err?.error || err?.message || err, null, 2))
    return NextResponse.json({ error: err?.error?.description || err?.message || "Failed" }, { status: 500 })
  }
}
