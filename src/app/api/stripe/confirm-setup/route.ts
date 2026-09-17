import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { clinicId, userId, skip } = await req.json()

    if (skip) {
      // User skipped payment method — just complete onboarding
      await db.user.update({
        where: { id: userId },
        data: { onboardingStep: "COMPLETED" }
      })
      return NextResponse.json({ ok: true })
    }

    // When Stripe is configured, this would:
    // 1. Confirm the SetupIntent
    // 2. Attach the payment method to the Stripe customer
    // 3. Update the Stripe subscription with the payment method
    // 4. Set subscription as default_payment_method
    const { getStripeSecretKey } = await import("@/lib/stripe-utils")
    const stripeSecretKey = await getStripeSecretKey()
    if (!stripeSecretKey) {
      // No Stripe — just complete onboarding
      await db.user.update({
        where: { id: userId },
        data: { onboardingStep: "COMPLETED" }
      })
      return NextResponse.json({ ok: true })
    }

    // Full Stripe flow (used when keys are set)
    const Stripe = (await import("stripe")).default
    const stripe = new Stripe(stripeSecretKey)

    const { setupIntentId } = await req.clone().json()
    if (setupIntentId) {
      const intent = await stripe.setupIntents.retrieve(setupIntentId)
      const paymentMethodId = intent.payment_method as string

      // Find subscription to get stripeCustomerId
      const sub = await db.subscription.findUnique({ where: { clinicId } })
      if (sub?.stripeCustomerId) {
        // Attach payment method as default for the customer
        await stripe.customers.update(sub.stripeCustomerId, {
          invoice_settings: { default_payment_method: paymentMethodId }
        })

        // If there is a Stripe subscription, set its default payment method too
        if (sub.stripeSubscriptionId) {
          await stripe.subscriptions.update(sub.stripeSubscriptionId, {
            default_payment_method: paymentMethodId
          })
        }
      }
    }

    await db.user.update({
      where: { id: userId },
      data: { onboardingStep: "COMPLETED" }
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("confirm-setup error:", err)
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 })
  }
}
