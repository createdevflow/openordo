"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireSuperAdmin, logAudit } from "../admin-base"

export async function createPlan(data: any) {
  try {
    const session = await requireSuperAdmin()
    const plan = await db.plan.create({ data })
    await logAudit(session.user.id!, "CREATE_PLAN", "Plan", plan.id, { name: plan.name })
    revalidatePath("/admin/plans")
    return { ok: true, planId: plan.id }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function updatePlan(id: string, data: any) {
  try {
    const session = await requireSuperAdmin()
    // TODO: integrate stripe if price changes
    await db.plan.update({ where: { id }, data })
    await logAudit(session.user.id!, "UPDATE_PLAN", "Plan", id, { updates: Object.keys(data) })
    revalidatePath("/admin/plans")
    revalidatePath(`/admin/plans/${id}`)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function togglePlanActive(id: string, isActive: boolean) {
  try {
    const session = await requireSuperAdmin()
    await db.plan.update({ where: { id }, data: { isActive } })
    await logAudit(session.user.id!, "TOGGLE_PLAN", "Plan", id, { isActive })
    revalidatePath("/admin/plans")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function archivePlan(id: string) {
  try {
    const session = await requireSuperAdmin()
    await db.plan.update({ where: { id }, data: { isActive: false } })
    await logAudit(session.user.id!, "ARCHIVE_PLAN", "Plan", id)
    revalidatePath("/admin/plans")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function reorderPlans(planIds: string[]) {
  try {
    const session = await requireSuperAdmin()
    for (let i = 0; i < planIds.length; i++) {
      await db.plan.update({ where: { id: planIds[i] }, data: { sortOrder: i } })
    }
    await logAudit(session.user.id!, "REORDER_PLANS", "Plan", "bulk")
    revalidatePath("/admin/plans")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}
