import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// Creates a Stripe Checkout Session in setup mode to collect a payment method
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { getStripeSecretKey } = await import("@/lib/stripe-utils")
  const stripeSecretKey = await getStripeSecretKey()
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 })
  }

  try {
    const { clinicId } = await req.json()
    const Stripe = (await import("stripe")).default
    const stripe = new Stripe(stripeSecretKey)

    // Get or create Stripe customer
    let sub = await db.subscription.findUnique({ where: { clinicId } })
    let customerId = sub?.stripeCustomerId

    if (!customerId) {
      const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
      const user = await db.user.findFirst({ 
        where: { memberships: { some: { clinicId, role: "OWNER" } } }
      })
      const customer = await stripe.customers.create({
        name: clinic?.name || "OpenORDO Clinic",
        email: user?.email || undefined,
        metadata: { clinicId }
      })
      customerId = customer.id

      if (sub) {
        await db.subscription.update({
          where: { clinicId },
          data: { stripeCustomerId: customerId }
        })
      }
    }

    // Create Stripe Checkout in setup mode to collect card
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      payment_method_types: ["card"],
      success_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/stripe/confirm-setup?session_id={CHECKOUT_SESSION_ID}&clinicId=${clinicId}&userId=${session.user.id}`,
      cancel_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/onboarding/plan/payment`,
      metadata: { clinicId, userId: session.user.id! }
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err: any) {
    console.error("setup-intent error:", err)
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 })
  }
}
