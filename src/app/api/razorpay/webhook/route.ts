import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import crypto from "crypto"
import { getRazorpayWebhookSecret } from "@/lib/razorpay-utils"
import { createTaxInvoice } from "@/server/actions/tax-invoice"
import { logger } from "@/lib/logger"

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

  const expectedBuffer = Buffer.from(expectedSignature)
  const signatureBuffer = Buffer.from(signature)

  if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
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
        const sub = await db.subscription.upsert({
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
        logger.info("Plan provisioned via webhook", { clinicId, planId: itemId })

        // Generate GST invoice on successful charge (fire-and-forget)
        if (event === "subscription.charged") {
          const chargeAmount = payload.payload.payment?.entity?.amount // in paise
          if (chargeAmount) {
            const clinic = await db.clinic.findUnique({ where: { id: clinicId } }).catch(() => null)
            createTaxInvoice({
              clinicId,
              billingType: "PLAN_SUBSCRIPTION",
              relatedId: sub.id,
              currency: "INR",
              countryCode: clinic?.countryCode || "IN",
              placeOfSupply: clinic?.billingConfig ? (() => { try { return JSON.parse(clinic.billingConfig!).state } catch { return undefined } })() : undefined,
              taxableValue: chargeAmount,
            }).catch(err => logger.error("Failed to create plan subscription invoice", err, { clinicId }))
          }
        }
      } else if (clinicId && type === "PLUGIN") {
        const cp = await db.clinicPlugin.upsert({
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
        logger.info("Plugin provisioned via webhook", { clinicId, pluginId: itemId })

        // Generate invoice on charged event
        if (event === "subscription.charged") {
          const chargeAmount = payload.payload.payment?.entity?.amount
          if (chargeAmount) {
            const clinic = await db.clinic.findUnique({ where: { id: clinicId } }).catch(() => null)
            createTaxInvoice({
              clinicId,
              billingType: "PLUGIN_PURCHASE",
              relatedId: cp.id,
              currency: "INR",
              countryCode: clinic?.countryCode || "IN",
              placeOfSupply: clinic?.billingConfig ? (() => { try { return JSON.parse(clinic.billingConfig!).state } catch { return undefined } })() : undefined,
              taxableValue: chargeAmount,
            }).catch(err => logger.error("Failed to create plugin invoice", err, { clinicId }))
          }
        }
      }
    } else if (event === "order.paid" || event === "payment.captured") {
      // For one-time payments
      const entity = payload.payload.payment?.entity || payload.payload.order?.entity
      const notes = entity?.notes || {}
      const { clinicId, type, itemId } = notes

      if (clinicId && type === "PLUGIN") {
        const cp = await db.clinicPlugin.upsert({
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
        logger.info("One-time plugin provisioned", { clinicId, pluginId: itemId })

        // Generate invoice for one-time purchase
        const chargeAmount = entity.amount
        if (chargeAmount) {
          const currency = (entity.currency === "USD") ? "USD" : "INR"
          const clinic = await db.clinic.findUnique({ where: { id: clinicId } }).catch(() => null)
          createTaxInvoice({
            clinicId,
            billingType: "PLUGIN_PURCHASE",
            relatedId: cp.id,
            currency,
            countryCode: clinic?.countryCode || (currency === "INR" ? "IN" : "US"),
            placeOfSupply: currency === "INR" && clinic?.billingConfig
              ? (() => { try { return JSON.parse(clinic.billingConfig!).state } catch { return undefined } })()
              : undefined,
            taxableValue: chargeAmount,
          }).catch(err => logger.error("Failed to create one-time plugin invoice", err, { clinicId }))
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    logger.error("Webhook processing error", err, { event })
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}

