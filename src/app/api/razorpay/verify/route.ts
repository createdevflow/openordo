import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import crypto from "crypto"
import { getRazorpayKeySecret } from "@/lib/razorpay-utils"
import { requireClinicId } from "@/lib/auth-utils"

export async function POST(req: Request) {
  try {
    const { getRazorpayKeySecret, isRazorpayBypassMode } = await import("@/lib/razorpay-utils")
    const bypass = await isRazorpayBypassMode()
    const secret = await getRazorpayKeySecret()
    if (!bypass && !secret) throw new Error("Razorpay secret not configured")

    const body = await req.json()
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_subscription_id, 
      razorpay_signature,
      type, 
      itemId,
      isOneTime
    } = body

    const clinicId = await requireClinicId()

    // Verify signature if not in bypass mode
    if (!bypass) {
      let generatedSignature = ""
      if (razorpay_order_id) {
        generatedSignature = crypto.createHmac("sha256", secret)
          .update(razorpay_order_id + "|" + razorpay_payment_id)
          .digest("hex")
      } else if (razorpay_subscription_id) {
        generatedSignature = crypto.createHmac("sha256", secret)
          .update(razorpay_payment_id + "|" + razorpay_subscription_id)
          .digest("hex")
      }

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 })
      }
    }

    // Provision the item since payment is verified
    if (type === "PLUGIN") {
      const quantity = body.quantity ?? 1
      const plugin = await db.plugin.findUnique({ where: { id: itemId }, select: { kind: true } })
      const isLimitModifier = plugin?.kind === "LIMIT_MODIFIER"

      // Check if clinic already has this plugin (for LIMIT_MODIFIER, increment quantity)
      const existing = await db.clinicPlugin.findFirst({
        where: { clinicId, pluginId: itemId }
      })

      if (existing && isLimitModifier) {
        // Stack: increment quantity on existing row
        await db.clinicPlugin.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + quantity,
            status: "ACTIVE",
            isEnabled: true,
            ...(isOneTime ? { razorpayOrderId: razorpay_order_id } : { razorpaySubscriptionId: razorpay_subscription_id })
          }
        })
      } else {
        await db.clinicPlugin.upsert({
          where: { clinicId_pluginId: { clinicId, pluginId: itemId } },
          update: {
            status: "ACTIVE",
            isEnabled: true,
            quantity,
            ...(isOneTime ? { razorpayOrderId: razorpay_order_id } : { razorpaySubscriptionId: razorpay_subscription_id })
          },
          create: {
            clinicId,
            pluginId: itemId,
            pricingModel: isOneTime ? "ONE_TIME" : "MONTHLY",
            status: "ACTIVE",
            isEnabled: true,
            quantity,
            grantedByAdmin: false,
            ...(isOneTime ? { razorpayOrderId: razorpay_order_id } : { razorpaySubscriptionId: razorpay_subscription_id })
          }
        })
      }
    } else if (type === "PLAN") {
      await db.subscription.upsert({
        where: { clinicId },
        update: { 
          planId: itemId, 
          status: "ACTIVE",
          razorpaySubscriptionId: razorpay_subscription_id
        },
        create: {
          clinicId,
          planId: itemId,
          status: "ACTIVE",
          razorpaySubscriptionId: razorpay_subscription_id
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Razorpay verify error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
