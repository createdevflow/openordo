import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireClinicId } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getRazorpayKeyId, getRazorpayKeySecret, isRazorpayBypassMode } from "@/lib/razorpay-utils";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const clinicId = await requireClinicId();
    const { quoteId } = await req.json();

    const quote = await db.checkoutQuote.findUniqueOrThrow({ where: { id: quoteId } });
    if (quote.clinicId !== clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    if (quote.gateway === "RAZORPAY") {
      const bypass = await isRazorpayBypassMode();
      const key_id = await getRazorpayKeyId();
      const key_secret = await getRazorpayKeySecret();

      if (!bypass && (!key_id || !key_secret)) {
        return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });
      }

      if (bypass) {
        return NextResponse.json({ bypass: true, success: true, id: "sub_bypass", keyId: "bypass" });
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Razorpay = require("razorpay");
      const rzp = new Razorpay({ key_id, key_secret });

      if (quote.interval === "ONE_TIME") {
        const order = await rzp.orders.create({
          amount: quote.totalAmount,
          currency: quote.currency,
          receipt: quote.id,
          notes: { quoteId: quote.id, clinicId }
        });
        return NextResponse.json({ orderId: order.id, keyId: key_id, amount: order.amount, currency: order.currency });
      } else {
        // Subscription
        let gatewayPlanId = "";
        
        // Find existing GatewayPriceMap
        const priceMap = await db.gatewayPriceMap.findUnique({
          where: {
            planId_interval_currency_taxRate: {
              planId: quote.itemId,
              interval: quote.interval,
              currency: quote.currency,
              taxRate: quote.taxRate
            }
          }
        });

        if (priceMap) {
          gatewayPlanId = priceMap.gatewayPlanId;
        } else {
          const item = quote.itemType === "PLAN" 
            ? await db.plan.findUnique({ where: { id: quote.itemId } })
            : await db.plugin.findUnique({ where: { id: quote.itemId } });
            
          const newPlan = await rzp.plans.create({
            period: quote.interval === "YEARLY" ? "yearly" : "monthly",
            interval: 1,
            item: {
              name: `${quote.itemType}: ${item?.name || quote.itemId}`,
              description: `${quote.interval} subscription`,
              amount: quote.totalAmount,
              currency: quote.currency
            }
          });
          gatewayPlanId = newPlan.id;
          
          await db.gatewayPriceMap.create({
            data: {
              planId: quote.itemId,
              interval: quote.interval,
              currency: quote.currency,
              taxRate: quote.taxRate,
              gatewayPlanId
            }
          });
        }

        const subscription = await rzp.subscriptions.create({
          plan_id: gatewayPlanId,
          customer_notify: 1,
          total_count: quote.interval === "YEARLY" ? 100 : 1200,
          notes: { quoteId: quote.id, clinicId },
          ...(quote.trialEndsAt && quote.trialEndsAt > new Date() ? { start_at: Math.floor(quote.trialEndsAt.getTime() / 1000) } : {})
        });

        return NextResponse.json({ subscriptionId: subscription.id, keyId: key_id });
      }
    } else if (quote.gateway === "STRIPE") {
      const { getStripeSecretKey } = await import("@/lib/stripe-utils");
      const stripeSecret = await getStripeSecretKey();
      if (!stripeSecret) {
        return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Stripe = require("stripe");
      const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

      const line_items = [{
        price_data: {
          currency: quote.currency.toLowerCase(),
          product_data: {
            name: `${quote.itemType}: ${quote.itemId}`,
          },
          unit_amount: quote.baseAmount,
          ...(quote.interval !== "ONE_TIME" ? { recurring: { interval: quote.interval === "YEARLY" ? "year" : "month" } } : {})
        },
        quantity: 1,
      }];

      if (quote.taxAmount > 0) {
        line_items.push({
          price_data: {
            currency: quote.currency.toLowerCase(),
            product_data: {
              name: quote.taxLabel,
            },
            unit_amount: quote.taxAmount,
            ...(quote.interval !== "ONE_TIME" ? { recurring: { interval: quote.interval === "YEARLY" ? "year" : "month" } } : {})
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: quote.interval === "ONE_TIME" ? "payment" : "subscription",
        line_items,
        client_reference_id: quote.id,
        metadata: { quoteId: quote.id, clinicId },
        success_url: `${process.env.APP_URL || "http://localhost:3000"}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL || "http://localhost:3000"}/dashboard/billing?canceled=true`,
        ...(quote.trialEndsAt && quote.trialEndsAt > new Date() && quote.interval !== "ONE_TIME" ? { subscription_data: { trial_end: Math.floor(quote.trialEndsAt.getTime() / 1000) } } : {})
      });

      return NextResponse.json({ sessionId: session.id, url: session.url });
    }

    return NextResponse.json({ error: "Invalid gateway" }, { status: 400 });
  } catch (err: any) {
    console.error("Failed to checkout quote", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
