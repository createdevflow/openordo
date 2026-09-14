import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  // TODO: Verify Stripe signature using stripe.webhooks.constructEvent
  // const sig = req.headers.get('stripe-signature') as string
  
  try {
    const payload = await req.json()
    const type = payload.type
    const data = payload.data.object

    if (type === 'invoice.payment_succeeded') {
      const subscriptionId = data.subscription
      const customerId = data.customer

      const sub = await db.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId }
      })

      if (sub) {
        await db.payment.create({
          data: {
            clinicId: sub.clinicId,
            amount: data.amount_paid,
            currency: data.currency,
            status: "succeeded",
            stripeInvoiceId: data.id
          }
        })
      }
    } else if (type === 'invoice.payment_failed') {
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
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 })
  }
}
