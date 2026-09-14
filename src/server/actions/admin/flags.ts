"use server"

import { db } from "@/lib/db"
import { requireSuperAdmin, logAudit } from "../admin-base"
import { revalidatePath } from "next/cache"

export async function togglePlatformFlag(key: string, enabled: boolean) {
  try {
    const session = await requireSuperAdmin()
    await db.platformFlag.update({
      where: { key },
      data: { enabled },
    })
    await logAudit(session.user.id!, "TOGGLE_FLAG", "PlatformFlag", key, { enabled })
    revalidatePath("/admin/settings")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function createFeature(data: {
  key: string; name: string; description?: string; category: string
}) {
  try {
    const session = await requireSuperAdmin()
    const feature = await db.feature.create({ data })
    await logAudit(session.user.id!, "CREATE_FEATURE", "Feature", feature.id)
    revalidatePath("/admin/settings")
    return { ok: true, feature }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function toggleFeatureGlobal(featureId: string, enabled: boolean) {
  try {
    const session = await requireSuperAdmin()
    await db.feature.update({
      where: { id: featureId },
      data: { isGloballyEnabled: enabled },
    })
    await logAudit(session.user.id!, "TOGGLE_FEATURE", "Feature", featureId, { enabled })
    revalidatePath("/admin/settings")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function deleteFeature(featureId: string) {
  try {
    const session = await requireSuperAdmin()
    await db.feature.delete({ where: { id: featureId } })
    await logAudit(session.user.id!, "DELETE_FEATURE", "Feature", featureId)
    revalidatePath("/admin/settings")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function upsertPlanFeature(planId: string, featureId: string, included: boolean) {
  try {
    const session = await requireSuperAdmin()
    await db.planFeature.upsert({
      where: { planId_featureId: { planId, featureId } },
      update: { included },
      create: { planId, featureId, included },
    })
    revalidatePath("/admin/plans")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}
