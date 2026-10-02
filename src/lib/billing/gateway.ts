import { db } from "../db";

export async function getGatewayForMarket(market: "IN" | "INTL"): Promise<"RAZORPAY" | "STRIPE"> {
  const setting = await db.globalSetting.findUnique({ where: { key: `PAYMENT_GATEWAY_${market}` } });
  if (setting && (setting.value === "RAZORPAY" || setting.value === "STRIPE")) {
    return setting.value as "RAZORPAY" | "STRIPE";
  }
  return market === "IN" ? "RAZORPAY" : "STRIPE";
}
