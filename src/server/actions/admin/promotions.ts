"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireSuperAdmin, logAudit } from "../admin-base"

export async function createPromo(data: any) {
  try {
    const session = await requireSuperAdmin()
    
    // Check conflicts if activating NEW_CLINICS_ONLY
    if (data.isActive && data.eligibility === "NEW_CLINICS_ONLY") {
      const existing = await db.promo.findFirst({ where: { isActive: true, eligibility: "NEW_CLINICS_ONLY" } })
      if (existing) {
        await db.promo.update({ where: { id: existing.id }, data: { isActive: false } })
      }
    }

    const promo = await db.promo.create({ data })
    await logAudit(session.user.id!, "CREATE_PROMO", "Promo", promo.id, { name: promo.name })
    revalidatePath("/admin/promotions")
    return { ok: true, promoId: promo.id }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function updatePromo(id: string, data: any) {
  try {
    const session = await requireSuperAdmin()
    await db.promo.update({ where: { id }, data })
    await logAudit(session.user.id!, "UPDATE_PROMO", "Promo", id)
    revalidatePath("/admin/promotions")
    revalidatePath(`/admin/promotions/${id}`)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function pausePromo(id: string) {
  try {
    const session = await requireSuperAdmin()
    await db.promo.update({ where: { id }, data: { isActive: false } })
    await logAudit(session.user.id!, "PAUSE_PROMO", "Promo", id)
    revalidatePath("/admin/promotions")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function resumePromo(id: string) {
  try {
    const session = await requireSuperAdmin()
    const promoToResume = await db.promo.findUnique({ where: { id } })
    
    if (promoToResume?.eligibility === "NEW_CLINICS_ONLY") {
      const existing = await db.promo.findFirst({ where: { isActive: true, eligibility: "NEW_CLINICS_ONLY" } })
      if (existing && existing.id !== id) {
        await db.promo.update({ where: { id: existing.id }, data: { isActive: false } })
      }
    }
    
    await db.promo.update({ where: { id }, data: { isActive: true } })
    await logAudit(session.user.id!, "RESUME_PROMO", "Promo", id)
    revalidatePath("/admin/promotions")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function endPromoNow(id: string) {
  try {
    const session = await requireSuperAdmin()
    await db.promo.update({ where: { id }, data: { isActive: false, endsAt: new Date() } })
    // In a real app we'd also immediately expire active redemptions here
    await logAudit(session.user.id!, "END_PROMO_NOW", "Promo", id)
    revalidatePath("/admin/promotions")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function deletePromo(id: string) {
  try {
    const session = await requireSuperAdmin()
    const promo = await db.promo.findUnique({ where: { id }, include: { _count: { select: { redemptions: true } } } })
    if (promo?._count.redemptions && promo._count.redemptions > 0) {
      return { ok: false, error: "Cannot delete promo with active redemptions" }
    }
    
    await db.promo.delete({ where: { id } })
    await logAudit(session.user.id!, "DELETE_PROMO", "Promo", id)
    revalidatePath("/admin/promotions")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}
