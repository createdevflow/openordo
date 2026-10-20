export type { PricingContext } from "./context";

export function formatPrice(amount: number, currency: "INR" | "USD" | string): string {
  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateSavingsPct(monthly: number | null | undefined, yearly: number | null | undefined): number {
  if (!monthly || !yearly || monthly <= 0 || yearly <= 0) return 0;
  const savings = Math.round((1 - yearly / (monthly * 12)) * 100);
  return savings >= 5 ? savings : 0;
}
