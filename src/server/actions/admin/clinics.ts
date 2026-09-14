"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireSuperAdmin, logAudit } from "../admin-base"

export async function suspendClinic(clinicId: string) {
  try {
    const session = await requireSuperAdmin()
    await db.clinic.update({ where: { id: clinicId }, data: { status: "SUSPENDED" } })
    await logAudit(session.user.id!, "SUSPEND_CLINIC", "Clinic", clinicId)
    revalidatePath("/admin/clinics")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function reactivateClinic(clinicId: string) {
  try {
    const session = await requireSuperAdmin()
    await db.clinic.update({ where: { id: clinicId }, data: { status: "ACTIVE" } })
    await logAudit(session.user.id!, "REACTIVATE_CLINIC", "Clinic", clinicId)
    revalidatePath("/admin/clinics")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function deleteClinic(clinicId: string) {
  try {
    const session = await requireSuperAdmin()
    await db.clinic.delete({ where: { id: clinicId } })
    await logAudit(session.user.id!, "DELETE_CLINIC", "Clinic", clinicId)
    revalidatePath("/admin/clinics")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function changeClinicPlan(clinicId: string, planId: string, reason: string) {
  try {
    const session = await requireSuperAdmin()
    const sub = await db.subscription.findUnique({ where: { clinicId } })
    if (sub) {
      await db.subscription.update({
        where: { clinicId },
        data: { planId }
      })
    } else {
      await db.subscription.create({
        data: { clinicId, planId, status: "ACTIVE" }
      })
    }
    await logAudit(session.user.id!, "CHANGE_PLAN", "Clinic", clinicId, { toPlan: planId, reason })
    revalidatePath("/admin/clinics")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function grantPromo(clinicId: string, promoId: string) {
  try {
    const session = await requireSuperAdmin()
    const promo = await db.promo.findUnique({ where: { id: promoId } })
    if (!promo) throw new Error("Promo not found")
    
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + promo.durationDays)

    let assignPlanId = promo.targetPlanId
    const defaultPlan = await db.plan.findFirst({ where: { isDefaultFree: true } })
    if (defaultPlan) {
      assignPlanId = defaultPlan.id
    }

    await db.$transaction([
      db.promoRedemption.create({
        data: { promoId, clinicId, expiresAt }
      }),
      db.promo.update({
        where: { id: promoId },
        data: { redemptionCount: { increment: 1 } }
      }),
      db.subscription.upsert({
        where: { clinicId },
        update: {
          planId: assignPlanId,
          status: "ACTIVE",
          promoId,
          promoExpiresAt: expiresAt
        },
        create: {
          clinicId,
          planId: assignPlanId,
          status: "ACTIVE",
          promoId,
          promoExpiresAt: expiresAt
        }
      })
    ])
    
    await logAudit(session.user.id!, "GRANT_PROMO", "Clinic", clinicId, { promoId })
    revalidatePath("/admin/clinics")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}
