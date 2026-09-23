"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireSuperAdmin, logAudit } from "../admin-base"

export async function createPlugin(data: any) {
  try {
    const session = await requireSuperAdmin()
    const plugin = await db.plugin.create({ data })
    await logAudit(session.user.id!, "CREATE_PLUGIN", "Plugin", plugin.id, { name: plugin.name })
    revalidatePath("/admin/plugins")
    return { ok: true, pluginId: plugin.id }
  } catch (e: any) {
    throw new Error(e.message || "Failed to create plugin")
  }
}

export async function updatePlugin(id: string, data: any) {
  try {
    const session = await requireSuperAdmin()
    await db.plugin.update({ where: { id }, data })
    await logAudit(session.user.id!, "UPDATE_PLUGIN", "Plugin", id, { updates: Object.keys(data) })
    revalidatePath("/admin/plugins")
    revalidatePath(`/admin/plugins/${id}`)
    return { ok: true }
  } catch (e: any) {
    throw new Error(e.message || "Failed to update plugin")
  }
}

export async function togglePluginActive(id: string, isActive: boolean) {
  try {
    const session = await requireSuperAdmin()
    await db.plugin.update({ where: { id }, data: { isActive } })
    await logAudit(session.user.id!, "TOGGLE_PLUGIN", "Plugin", id, { isActive })
    revalidatePath("/admin/plugins")
    return { ok: true }
  } catch (e: any) {
    throw new Error(e.message || "Failed to toggle plugin")
  }
}

export async function archivePlugin(id: string) {
  try {
    const session = await requireSuperAdmin()
    await db.plugin.update({ where: { id }, data: { isActive: false } })
    await logAudit(session.user.id!, "ARCHIVE_PLUGIN", "Plugin", id)
    revalidatePath("/admin/plugins")
    return { ok: true }
  } catch (e: any) {
    throw new Error(e.message || "Failed to archive plugin")
  }
}

/**
 * Admin: Grant a plugin to a clinic for free (no Stripe payment).
 */
export async function grantPluginToClinic(
  clinicId: string,
  pluginId: string,
  pricingModel: "ONE_TIME" | "MONTHLY" | "YEARLY",
  quantity: number = 1
) {
  try {
    const session = await requireSuperAdmin()

    // Upsert so it's idempotent (re-granting resets to ACTIVE)
    await db.clinicPlugin.upsert({
      where: { clinicId_pluginId: { clinicId, pluginId } },
      update: { status: "ACTIVE", isEnabled: true, grantedByAdmin: true, pricingModel, quantity },
      create: {
        clinicId,
        pluginId,
        pricingModel,
        status: "ACTIVE",
        isEnabled: true,
        grantedByAdmin: true,
        quantity,
      },
    })

    await logAudit(session.user.id!, "GRANT_PLUGIN", "Clinic", clinicId, { pluginId, pricingModel })
    revalidatePath(`/admin/clinics/${clinicId}`)
    return { ok: true }
  } catch (e: any) {
    throw new Error(e.message || "Failed to grant plugin")
  }
}

/**
 * Admin: Revoke a plugin from a clinic.
 */
export async function revokePluginFromClinic(clinicPluginId: string) {
  try {
    const session = await requireSuperAdmin()
    const cp = await db.clinicPlugin.findUnique({ where: { id: clinicPluginId } })
    if (!cp) throw new Error("ClinicPlugin not found")

    await db.clinicPlugin.delete({ where: { id: clinicPluginId } })
    await logAudit(session.user.id!, "REVOKE_PLUGIN", "Clinic", cp.clinicId, { pluginId: cp.pluginId })
    revalidatePath(`/admin/clinics/${cp.clinicId}`)
    return { ok: true }
  } catch (e: any) {
    throw new Error(e.message || "Failed to revoke plugin")
  }
}
