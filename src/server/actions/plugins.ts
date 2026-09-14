"use server"

import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"

async function getClinicId() {
  return requireClinicId()
}

/**
 * Toggle a plugin's isEnabled flag for the clinic.
 * Non-destructive: disabling pauses UI without canceling billing.
 */
export async function togglePluginEnabled(clinicPluginId: string, enabled: boolean) {
  const clinicId = await getClinicId()

  // Verify ownership
  const cp = await db.clinicPlugin.findFirst({
    where: { id: clinicPluginId, clinicId },
  })
  if (!cp) throw new Error("Plugin not found for this clinic")

  await db.clinicPlugin.update({
    where: { id: clinicPluginId },
    data: { isEnabled: enabled },
  })

  revalidatePath("/dashboard/addons")
  revalidatePath("/dashboard")
  return { ok: true }
}

/**
 * List active plugins not yet purchased by the clinic.
 */
export async function listAvailablePluginsAction() {
  const clinicId = await getClinicId()
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
 * List plugins the clinic has purchased (ACTIVE or CANCELED not-yet-expired).
 */
export async function listClinicPluginsAction() {
  const clinicId = await getClinicId()
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
 * Simulated "purchase" — in production this creates a Stripe Checkout session.
 * For now, creates the ClinicPlugin row directly (free trial / demo mode).
 */
export async function purchasePluginAction(
  pluginId: string,
  pricingModel: "ONE_TIME" | "MONTHLY" | "YEARLY"
) {
  const clinicId = await getClinicId()

  const plugin = await db.plugin.findUnique({ where: { id: pluginId } })
  if (!plugin || !plugin.isActive) throw new Error("Plugin not available")

  // Check not already purchased
  const existing = await db.clinicPlugin.findFirst({ where: { clinicId, pluginId } })
  if (existing) throw new Error("Plugin already added to your clinic")

  const now = new Date()
  const currentPeriodEnd =
    pricingModel === "ONE_TIME"
      ? null
      : pricingModel === "MONTHLY"
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

  await db.clinicPlugin.create({
    data: {
      clinicId,
      pluginId,
      pricingModel,
      status: "ACTIVE",
      isEnabled: true,
      currentPeriodEnd,
      grantedByAdmin: false,
    },
  })

  revalidatePath("/dashboard/addons")
  revalidatePath("/dashboard")
  return { ok: true }
}

/**
 * Uninstall a plugin from the clinic
 */
export async function uninstallPluginAction(clinicPluginId: string) {
  const clinicId = await getClinicId()

  const cp = await db.clinicPlugin.findFirst({
    where: { id: clinicPluginId, clinicId },
  })
  if (!cp) throw new Error("Plugin not found for this clinic")

  await db.clinicPlugin.delete({
    where: { id: clinicPluginId },
  })

  revalidatePath("/dashboard/addons")
  revalidatePath("/dashboard")
  return { ok: true }
}
