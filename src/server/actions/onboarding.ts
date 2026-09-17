"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function createClinicAction(prevState: any, formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("Not logged in")

  const name = formData.get("name") as string
  const type = formData.get("type") as string
  const country = formData.get("country") as string || "US"
  
  if (!name || !type) return { error: "Missing required fields" }

  let baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")
  if (baseSlug.length < 3) baseSlug = baseSlug.padEnd(3, "0")
  if (baseSlug.length > 30) baseSlug = baseSlug.substring(0, 30)

  let slug = baseSlug
  let attempt = 1
  while (await db.clinic.findUnique({ where: { slug } })) {
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  const clinic = await db.clinic.create({
    data: { name, slug, type, country }
  })

  await db.membership.create({
    data: { userId: session.user.id, clinicId: clinic.id, role: "OWNER" }
  })

  await db.user.update({
    where: { id: session.user.id },
    data: { activeClinicId: clinic.id, onboardingStep: "COMPLIANCE" }
  })

  redirect("/onboarding/compliance")
}

export async function saveComplianceAction(prevState: any, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Not logged in")

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  const clinicId = user?.activeClinicId
  if (!clinicId) throw new Error("No active clinic in session")

  const complianceData: Record<string, string> = {}
  formData.forEach((value, key) => {
    if (key.startsWith("$ACTION")) return
    complianceData[key] = value.toString()
  })

  await db.clinic.update({
    where: { id: clinicId },
    data: { billingConfig: JSON.stringify(complianceData) }
  })

  await db.user.update({
    where: { id: session.user.id },
    data: { onboardingStep: "STAFF" }
  })

  redirect("/onboarding/staff")
}

export async function saveStaffAction(prevState: any, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Not logged in")

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  const clinicId = user?.activeClinicId
  if (!clinicId) throw new Error("No active clinic in session")

  const name = formData.get("name") as string
  const specialty = formData.get("specialty") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string

  if (name && specialty) {
    await db.doctor.create({
      data: {
        clinicId,
        name,
        specialty,
        phone: phone || "",
        email: email || "",
        workingDays: JSON.stringify(["Mon", "Tue", "Wed", "Thu", "Fri"]),
        userId: session.user.id
      }
    })
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { onboardingStep: "PLAN_SELECTION" }
  })

  redirect("/onboarding/plan")
}

export async function selectPlanAction(prevState: any, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return

  let clinicId = session?.user?.clinicId
  if (!clinicId) {
    const user = await db.user.findUnique({ where: { id: session.user.id } })
    clinicId = user?.activeClinicId || null
  }
  if (!clinicId) throw new Error("No active clinic in session")

  const planId = formData.get("planId") as string
  if (!planId) return { error: "No plan selected" }

  const plan = await db.plan.findUnique({ where: { id: planId } })
  if (!plan) return { error: "Plan not found" }

  const isPaidPlan = plan.priceMonthlyUsd > 0 || plan.priceMonthlyInr > 0

  if (isPaidPlan) {
    const trialSetting = await db.globalSetting.findUnique({ where: { key: "DEFAULT_TRIAL_DAYS" } })
    const trialDays = parseInt(trialSetting?.value || "14", 10)

    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays)

    await db.subscription.upsert({
      where: { clinicId },
      update: { planId, status: "TRIALING", trialEndsAt, cancelAtPeriodEnd: false },
      create: { clinicId, planId, status: "TRIALING", trialEndsAt }
    })

    await db.user.update({
      where: { id: session.user.id! },
      data: { onboardingStep: "PAYMENT_SETUP" }
    })

    redirect("/onboarding/plan/payment")
  } else {
    await db.subscription.upsert({
      where: { clinicId },
      update: { planId, status: "ACTIVE", trialEndsAt: null },
      create: { clinicId, planId, status: "ACTIVE" }
    })

    await db.user.update({
      where: { id: session.user.id! },
      data: { onboardingStep: "COMPLETED" }
    })

    redirect("/dashboard")
  }
}

export async function redeemPromoAction(prevState: any, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Not logged in" }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  const clinicId = user?.activeClinicId
  if (!clinicId) return { error: "No active clinic in session" }

  const promoId = formData.get("promoId") as string
  if (!promoId) return { error: "No promo selected" }

  const promo = await db.promo.findUnique({ where: { id: promoId } })
  if (!promo || !promo.isActive) return { error: "Promo is not active" }
  
  if (promo.redemptionLimit && promo.redemptionCount >= promo.redemptionLimit) {
    return { error: "Promo limit reached" }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + promo.durationDays)

  let assignPlanId = promo.targetPlanId
  const defaultPlan = await db.plan.findFirst({ where: { isDefaultFree: true } })
  if (defaultPlan) assignPlanId = defaultPlan.id

  await db.$transaction([
    db.promoRedemption.create({ data: { promoId, clinicId, expiresAt } }),
    db.promo.update({ where: { id: promoId }, data: { redemptionCount: { increment: 1 } } }),
    db.subscription.upsert({
      where: { clinicId },
      update: { planId: assignPlanId, status: "ACTIVE", promoId, promoExpiresAt: expiresAt },
      create: { clinicId, planId: assignPlanId, status: "ACTIVE", promoId, promoExpiresAt: expiresAt }
    }),
    db.user.update({ where: { id: session.user.id }, data: { onboardingStep: "COMPLETED" } })
  ])

  redirect("/dashboard")
}
