import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireClinicId } from "@/lib/auth-utils";
import { createCheckoutQuote } from "@/lib/billing/quote";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const clinicId = await requireClinicId();
    const { itemType, itemId, interval = "MONTHLY" } = await req.json();

    let baseAmount = 0;
    let trialEndsAt: Date | undefined;

    if (itemType === "PLAN") {
      const plan = await db.plan.findUniqueOrThrow({ where: { id: itemId } });
      const clinic = await db.clinic.findUnique({ where: { id: clinicId }, include: { subscription: true } });
      
      // Check currency from context, wait, createCheckoutQuote handles pricing context!
      // But baseAmount needs currency to pick priceMonthlyInr vs Usd.
      // We must resolve context first.
      const { resolvePricingContext } = await import("@/lib/pricing/context");
      const ctx = await resolvePricingContext();
      
      baseAmount = ctx.currency === "INR" 
        ? (interval === "YEARLY" && plan.priceYearlyInr ? plan.priceYearlyInr : plan.priceMonthlyInr) * 100 // assuming plan stores full INR, so * 100 for paise
        : (interval === "YEARLY" && plan.priceYearlyUsd ? plan.priceYearlyUsd : plan.priceMonthlyUsd) * 100; // cents

      // Keep trialEndsAt if currently trialing
      if (clinic?.subscription?.status === "TRIALING" && clinic.subscription.trialEndsAt) {
        if (clinic.subscription.trialEndsAt > new Date()) {
          trialEndsAt = clinic.subscription.trialEndsAt;
        }
      }
    } else if (itemType === "PLUGIN") {
      const plugin = await db.plugin.findUniqueOrThrow({ where: { id: itemId } });
      const { resolvePricingContext } = await import("@/lib/pricing/context");
      const ctx = await resolvePricingContext();
      
      if (interval === "MONTHLY") {
        baseAmount = ctx.currency === "INR" ? (plugin.priceMonthlyINR || 0) : (plugin.priceMonthlyUSD || 0);
      } else if (interval === "YEARLY") {
        baseAmount = ctx.currency === "INR" ? (plugin.priceYearlyINR || 0) : (plugin.priceYearlyUSD || 0);
      } else {
        baseAmount = ctx.currency === "INR" ? (plugin.priceOneTimeINR || 0) : (plugin.priceOneTimeUSD || 0);
      }
    }

    const quote = await createCheckoutQuote({
      clinicId,
      itemType,
      itemId,
      interval,
      baseAmount,
      trialEndsAt
    });

    return NextResponse.json({ quote });
  } catch (err: any) {
    console.error("Failed to create quote", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
