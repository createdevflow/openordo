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
 * Returns the effective doctor limit for a clinic:
 * planLimit (null = unlimited) + sum of quantity from active Extra Doctor Seat plugins.
 * Returns null if the effective limit is unlimited.
 */
export async function getEffectiveDoctorLimit(
  clinicId: string,
  planLimit: number | null
): Promise<{ effectiveLimit: number | null; extraSeats: number }> {
  const extraSeatPlugin = await db.clinicPlugin.findFirst({
    where: {
      clinicId,
      plugin: { slug: "extra-doctor-seat" },
      status: "ACTIVE",
      isEnabled: true,
    },
    select: { quantity: true },
  })

  const extraSeats = extraSeatPlugin?.quantity ?? 0

  if (planLimit === null) {
    return { effectiveLimit: null, extraSeats }
  }

  return { effectiveLimit: planLimit + extraSeats, extraSeats }
}

const BASE_STORAGE_BYTES = 5 * 1024 * 1024 * 1024 // 5 GB
const STORAGE_PER_UNIT_BYTES = 10 * 1024 * 1024 * 1024 // 10 GB per unit

/**
 * Returns storage quota and current usage for a clinic.
 * Base = 5 GB. Each active Document Storage unit adds 10 GB.
 */
export async function getEffectiveStorageQuota(clinicId: string): Promise<{
  quotaBytes: number
  usedBytes: number
  quotaGB: number
  usedGB: number
}> {
  const storagePlugin = await db.clinicPlugin.findFirst({
    where: {
      clinicId,
      plugin: { slug: "document-storage" },
      status: "ACTIVE",
      isEnabled: true,
    },
    select: { quantity: true },
  })

  const extraUnits = storagePlugin?.quantity ?? 0
  const quotaBytes = BASE_STORAGE_BYTES + extraUnits * STORAGE_PER_UNIT_BYTES

  // Sum all tracked file sizes for this clinic
  const usageAgg = await db.storageUsage.aggregate({
    where: { clinicId },
    _sum: { bytes: true },
  })
  const usedBytes = usageAgg._sum.bytes ?? 0

  return {
    quotaBytes,
    usedBytes,
    quotaGB: quotaBytes / (1024 * 1024 * 1024),
    usedGB: usedBytes / (1024 * 1024 * 1024),
  }
}

/**
 * Returns the quantity of an active LIMIT_MODIFIER plugin for a clinic.
 * Returns 0 if not purchased or inactive.
 */
export async function getActivePluginQuantity(clinicId: string, slug: string): Promise<number> {
  const cp = await db.clinicPlugin.findFirst({
    where: { clinicId, plugin: { slug }, status: "ACTIVE", isEnabled: true },
    select: { quantity: true },
  })
  return cp?.quantity ?? 0
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
