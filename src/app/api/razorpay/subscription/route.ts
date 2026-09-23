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
    const { type, itemId, planId: explicitPlanId, quantity = 1 } = await req.json()
    const clinicId = await requireClinicId()

    if (bypass) {
      if (type === "PLAN") {
        const existingSub = await db.subscription.findUnique({ where: { clinicId } })
        if (existingSub?.razorpaySubscriptionId && existingSub.status !== "CANCELLED" && existingSub.status !== "INCOMPLETE") {
          await db.subscription.update({
            where: { id: existingSub.id },
            data: { planId: itemId }
          })
          return NextResponse.json({ isUpdate: true, success: true })
        }
      }
      return NextResponse.json({ bypass: true, success: true, id: "sub_bypass", keyId: "bypass" })
    }

    const rzp = new Razorpay({ key_id, key_secret })

    let finalPlanId = explicitPlanId

    // Auto-create plan on Razorpay if it doesn't exist
    if (!finalPlanId) {
      if (type === "PLAN") {
        const plan = await db.plan.findUnique({ where: { id: itemId } })
        if (!plan) throw new Error("Plan not found")
        const amountInr = plan.priceMonthlyInr
        if (!amountInr || amountInr < 10) {
          throw new Error(`Plan "${plan.name}" has an invalid price (₹${amountInr}). Please update the plan price in Admin > Plans before accepting payments.`)
        }
        const newPlan = await rzp.plans.create({
          period: "monthly",
          interval: 1,
          item: {
            name: `Plan: ${plan.name}`,
            description: `Monthly subscription for ${plan.name}`,
            amount: amountInr * 100, // paise
            currency: "INR"
          }
        })
        finalPlanId = newPlan.id
        await db.plan.update({ where: { id: plan.id }, data: { razorpayPlanIdMonthly: newPlan.id } })
      } else if (type === "PLUGIN") {
        const plugin = await db.plugin.findUnique({ where: { id: itemId } })
        if (!plugin || !plugin.priceMonthlyINR) throw new Error("Plugin not found or not recurring")
        const newPlan = await rzp.plans.create({
          period: "monthly",
          interval: 1,
          item: {
            name: `Plugin: ${plugin.name}`,
            description: `Monthly subscription for ${plugin.name}`,
            amount: plugin.priceMonthlyINR, // already in paise
            currency: "INR"
          }
        })
        finalPlanId = newPlan.id
        await db.plugin.update({ where: { id: plugin.id }, data: { razorpayPlanIdMonthly: newPlan.id } })
      }
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
            data: { planId: itemId }
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
        notes: { clinicId, type, itemId }
      })
      subscriptionId = subscription.id
    }

    return NextResponse.json({ id: subscriptionId, keyId: key_id, isUpdate })
  } catch (err: any) {
    console.error("razorpay subscription error:", JSON.stringify(err?.error || err?.message || err, null, 2))
    return NextResponse.json({ error: err?.error?.description || err?.message || "Failed" }, { status: 500 })
  }
}
