import { db } from "../db";
import { resolvePricingContext } from "../pricing/context";
import { computeTax } from "../tax";
import { getGatewayForMarket } from "./gateway";

export type CheckoutQuote = {
  id: string;
  clinicId: string;
  itemType: "PLAN" | "PLUGIN";
  itemId: string;
  interval: "MONTHLY" | "YEARLY" | "ONE_TIME";
  currency: "INR" | "USD";
  countryCode: string;
  baseAmount: number;
  taxLabel: string;
  taxRate: number;
  taxAmount: number;
  cgst?: number; sgst?: number; igst?: number;
  totalAmount: number;
  gateway: "RAZORPAY" | "STRIPE";
  trialEndsAt?: Date;
};

export async function createCheckoutQuote(input: {
  clinicId: string;
  itemType: "PLAN" | "PLUGIN";
  itemId: string;
  interval: "MONTHLY" | "YEARLY" | "ONE_TIME";
  baseAmount: number;
  trialEndsAt?: Date;
}): Promise<CheckoutQuote> {
  const clinic = await db.clinic.findUniqueOrThrow({ where: { id: input.clinicId } });
  
  const ctx = await resolvePricingContext();
  const taxInfo = computeTax(input.baseAmount, ctx.taxConfig, clinic.region);
  
  const gateway = await getGatewayForMarket(ctx.market);
  
  const quote = await db.checkoutQuote.create({
    data: {
      clinicId: input.clinicId,
      itemType: input.itemType,
      itemId: input.itemId,
      interval: input.interval,
      currency: ctx.currency,
      countryCode: ctx.countryCode,
      baseAmount: input.baseAmount,
      taxLabel: taxInfo.taxLabel,
      taxRate: taxInfo.taxRate,
      taxAmount: taxInfo.taxAmount,
      cgst: taxInfo.cgst,
      sgst: taxInfo.sgst,
      igst: taxInfo.igst,
      totalAmount: taxInfo.totalAmount,
      gateway: gateway,
      trialEndsAt: input.trialEndsAt
    }
  });
  
  return {
    ...quote,
    itemType: quote.itemType as "PLAN" | "PLUGIN",
    interval: quote.interval as "MONTHLY" | "YEARLY" | "ONE_TIME",
    currency: quote.currency as "INR" | "USD",
    gateway: quote.gateway as "RAZORPAY" | "STRIPE",
    cgst: quote.cgst || undefined,
    sgst: quote.sgst || undefined,
    igst: quote.igst || undefined,
    trialEndsAt: quote.trialEndsAt || undefined
  };
}
