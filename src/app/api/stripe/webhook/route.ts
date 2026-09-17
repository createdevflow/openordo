import { NextResponse } from "next/server"
import { db } from "@/lib/db"

async function lockCancelledClinic(clinicId: string) {
  await db.clinic.update({
    where: { id: clinicId },
    data: {
      status: "LOCKED_CANCELLED",
      lockedAt: new Date(),
    }
  })

  await db.subscription.update({
    where: { clinicId },
    data: {
      status: "CANCELED",
      trialEndsAt: null,
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    }
  })

  console.log(`[webhook] Clinic ${clinicId} locked due to cancelled subscription. Data will be retained for 30 days.`)
}

export async function POST(req: Request) {
  const { getStripeSecretKey, getStripeWebhookSecret } = await import("@/lib/stripe-utils")
  const stripeSecretKey = await getStripeSecretKey()
  const endpointSecret = await getStripeWebhookSecret()

  try {
    let payload: any

    if (stripeSecretKey && endpointSecret) {
      // Verify Stripe signature when keys are configured
      const Stripe = (await import("stripe")).default
      const stripe = new Stripe(stripeSecretKey)
      const sig = req.headers.get("stripe-signature") as string
      const body = await req.text()
      try {
        payload = stripe.webhooks.constructEvent(body, sig, endpointSecret)
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message)
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
      }
    } else {
      // Development: accept unsigned payloads
      payload = await req.json()
    }

    const type = payload.type
    const data = payload.data?.object

    if (type === "checkout.session.completed") {
      const meta = data.metadata
      if (meta?.type === "PLAN") {
        await db.subscription.upsert({
          where: { clinicId: meta.clinicId },
          update: { 
            planId: meta.itemId, 
            status: "ACTIVE",
            stripeSubscriptionId: data.subscription as string,
          },
          create: {
            clinicId: meta.clinicId,
            planId: meta.itemId,
            status: "ACTIVE",
            stripeSubscriptionId: data.subscription as string,
          }
        })
        console.log(`[webhook] Plan ${meta.itemId} provisioned for clinic ${meta.clinicId}`)
      } else if (meta?.type === "PLUGIN") {
        // One-time payment (payment_intent) vs Recurring (subscription)
        const currentPeriodEnd = data.subscription ? undefined : null // null means lifetime, undefined means we'll get it from invoice.payment_succeeded

        await db.clinicPlugin.upsert({
          where: { clinicId_pluginId: { clinicId: meta.clinicId, pluginId: meta.itemId } },
          update: {
            status: "ACTIVE",
            isEnabled: true,
            stripeSubscriptionId: data.subscription ? (data.subscription as string) : null,
            stripePaymentIntentId: data.payment_intent ? (data.payment_intent as string) : null,
          },
          create: {
            clinicId: meta.clinicId,
            pluginId: meta.itemId,
            pricingModel: data.subscription ? "MONTHLY" : "ONE_TIME", // Fallback, real model depends on price
            status: "ACTIVE",
            isEnabled: true,
            currentPeriodEnd,
            grantedByAdmin: false,
            stripeSubscriptionId: data.subscription ? (data.subscription as string) : null,
            stripePaymentIntentId: data.payment_intent ? (data.payment_intent as string) : null,
          }
        })
        console.log(`[webhook] Plugin ${meta.itemId} provisioned for clinic ${meta.clinicId}`)
      }
    } else if (type === "invoice.payment_succeeded") {
      const subscriptionId = data.subscription
      const sub = await db.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId }
      })

      if (sub) {
        // Record the payment and move subscription to ACTIVE
        await Promise.all([
          db.payment.create({
            data: {
              clinicId: sub.clinicId,
              amount: data.amount_paid,
              currency: data.currency,
              status: "succeeded",
              stripeInvoiceId: data.id
            }
          }),
          db.subscription.update({
            where: { clinicId: sub.clinicId },
            data: {
              status: "ACTIVE",
              trialEndsAt: null,
              currentPeriodEnd: data.period_end ? new Date(data.period_end * 1000) : undefined,
            }
          })
        ])
        console.log(`[webhook] Payment succeeded for clinic ${sub.clinicId}`)
      }

    } else if (type === "invoice.payment_failed") {
      const subscriptionId = data.subscription
      const sub = await db.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId }
      })

      if (sub) {
        await db.payment.create({
          data: {
            clinicId: sub.clinicId,
            amount: data.amount_due,
            currency: data.currency,
            status: "failed",
            stripeInvoiceId: data.id
          }
        })
        console.log(`[webhook] Payment failed for clinic ${sub.clinicId}`)
        // Stripe will retry — only downgrade when subscription is actually deleted/past_due past grace
      }

    } else if (type === "customer.subscription.deleted") {
      // Stripe subscription deleted (after all retries failed or user cancelled via Stripe)
      const subscriptionId = data.id
      const sub = await db.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId }
      })

      if (sub) {
        await lockCancelledClinic(sub.clinicId)
      }

    } else if (type === "customer.subscription.updated") {
      // Handles trial_end → active transition
      const subscriptionId = data.id
      const sub = await db.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId }
      })

      if (sub && data.status === "active") {
        await db.subscription.update({
          where: { clinicId: sub.clinicId },
          data: {
            status: "ACTIVE",
            trialEndsAt: null,
            currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end * 1000) : undefined,
          }
        })
      } else if (sub && data.status === "past_due") {
        // Keep ACTIVE during Stripe retry grace period (Stripe retries for several days)
        // Only downgrade on subscription.deleted
        console.log(`[webhook] Subscription past_due for clinic ${sub.clinicId} — awaiting Stripe retries`)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error("Webhook handler failed:", err)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 400 })
  }
}
