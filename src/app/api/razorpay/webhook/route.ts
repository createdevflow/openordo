import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import crypto from "crypto"
import { getRazorpayWebhookSecret } from "@/lib/razorpay-utils"

export async function POST(req: Request) {
  const secret = await getRazorpayWebhookSecret()
  if (!secret) return NextResponse.json({ error: "Webhook secret missing" }, { status: 500 })

  const signature = req.headers.get("x-razorpay-signature")
  if (!signature) return NextResponse.json({ error: "No signature" }, { status: 400 })

  const rawBody = await req.text()
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")

  if (expectedSignature !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const payload = JSON.parse(rawBody)
  const event = payload.event

  try {
    if (event === "subscription.activated" || event === "subscription.charged") {
      const subscription = payload.payload.subscription.entity
      const notes = subscription.notes || {}
      const { clinicId, type, itemId } = notes

      if (clinicId && type === "PLAN") {
        await db.subscription.upsert({
          where: { clinicId },
          update: { 
            planId: itemId, 
            status: "ACTIVE",
            razorpaySubscriptionId: subscription.id,
            razorpayCustomerId: subscription.customer_id
          },
          create: {
            clinicId,
            planId: itemId,
            status: "ACTIVE",
            razorpaySubscriptionId: subscription.id,
            razorpayCustomerId: subscription.customer_id
          }
        })
        console.log(`[webhook] Plan ${itemId} provisioned for clinic ${clinicId}`)
      } else if (clinicId && type === "PLUGIN") {
        await db.clinicPlugin.upsert({
          where: { clinicId_pluginId: { clinicId, pluginId: itemId } },
          update: {
            status: "ACTIVE",
            isEnabled: true,
            razorpaySubscriptionId: subscription.id,
          },
          create: {
            clinicId,
            pluginId: itemId,
            pricingModel: "MONTHLY", 
            status: "ACTIVE",
            isEnabled: true,
            grantedByAdmin: false,
            razorpaySubscriptionId: subscription.id,
          }
        })
        console.log(`[webhook] Plugin ${itemId} provisioned for clinic ${clinicId}`)
      }
    } else if (event === "order.paid" || event === "payment.captured") {
      // For one-time payments
      const entity = payload.payload.payment?.entity || payload.payload.order?.entity
      const notes = entity?.notes || {}
      const { clinicId, type, itemId } = notes

      if (clinicId && type === "PLUGIN") {
        await db.clinicPlugin.upsert({
          where: { clinicId_pluginId: { clinicId, pluginId: itemId } },
          update: {
            status: "ACTIVE",
            isEnabled: true,
            razorpayOrderId: entity.order_id || entity.id,
          },
          create: {
            clinicId,
            pluginId: itemId,
            pricingModel: "ONE_TIME", 
            status: "ACTIVE",
            isEnabled: true,
            grantedByAdmin: false,
            razorpayOrderId: entity.order_id || entity.id,
          }
        })
        console.log(`[webhook] One-Time Plugin ${itemId} provisioned for clinic ${clinicId}`)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error("Webhook processing error:", err)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}
