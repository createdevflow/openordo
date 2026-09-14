import { db } from "./db"

/**
 * Returns true if the clinic has an ACTIVE, isEnabled ClinicPlugin for the given slug.
 * Called server-side in every plugin-gated layout/page.
 */
export async function hasActivePlugin(clinicId: string, slug: string): Promise<boolean> {
  const cp = await db.clinicPlugin.findFirst({
    where: {
      clinicId,
      plugin: { slug },
      status: "ACTIVE",
      isEnabled: true,
    },
  })
  return !!cp
}

/**
 * Returns all active plugins (platform-wide) sorted by sortOrder.
 */
export async function listActivePlugins() {
  return db.plugin.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  })
}

/**
 * Returns all plugins the clinic has NOT yet purchased.
 */
export async function listAvailablePlugins(clinicId: string) {
  const purchased = await db.clinicPlugin.findMany({
    where: { clinicId },
    select: { pluginId: true },
  })
  const purchasedIds = purchased.map((cp) => cp.pluginId)

  return db.plugin.findMany({
    where: {
      isActive: true,
      id: { notIn: purchasedIds.length > 0 ? purchasedIds : ["__none__"] },
    },
    orderBy: { sortOrder: "asc" },
  })
}

/**
 * Returns all plugins this clinic currently owns (ACTIVE or CANCELED but not yet expired).
 */
export async function listClinicPlugins(clinicId: string) {
  return db.clinicPlugin.findMany({
    where: {
      clinicId,
      status: { in: ["ACTIVE", "CANCELED"] },
    },
    include: { plugin: true },
    orderBy: { purchasedAt: "asc" },
  })
}

/**
 * Formats price from smallest currency unit to display string.
 * Prices stored as integers in smallest unit (e.g., 99900 = ₹999.00 or $9.99 in USD).
 * For INR stored as paise × 100 (99900 paise = ₹999), for USD stored as cents (1499 = $14.99).
 */
export function formatPrice(amount: number, currency: "INR" | "USD"): string {
  if (currency === "INR") {
    return `₹${(amount / 100).toLocaleString("en-IN")}`
  }
  return `$${(amount / 100).toFixed(2)}`
}

/**
 * Returns a human-readable pricing summary string for a plugin.
 */
export function pluginPricingSummary(
  plugin: {
    priceOneTimeINR: number | null
    priceOneTimeUSD: number | null
    priceMonthlyINR: number | null
    priceMonthlyUSD: number | null
    priceYearlyINR: number | null
    priceYearlyUSD: number | null
  },
  currency: "INR" | "USD"
): string {
  const parts: string[] = []
  if (plugin.priceOneTimeINR && plugin.priceOneTimeUSD) {
    parts.push(`${formatPrice(currency === "INR" ? plugin.priceOneTimeINR : plugin.priceOneTimeUSD, currency)} one-time`)
  }
  if (plugin.priceMonthlyINR && plugin.priceMonthlyUSD) {
    parts.push(`${formatPrice(currency === "INR" ? plugin.priceMonthlyINR : plugin.priceMonthlyUSD, currency)}/mo`)
  }
  if (plugin.priceYearlyINR && plugin.priceYearlyUSD) {
    parts.push(`${formatPrice(currency === "INR" ? plugin.priceYearlyINR : plugin.priceYearlyUSD, currency)}/yr`)
  }
  return parts.join(" or ") || "Free"
}
