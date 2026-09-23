import { db } from "./db"

export const DEFAULT_TIER_FEATURES: Record<string, string[]> = {
  starter: [
    "core.patient_management",
    "core.appointment_calendar",
    "core.doctor_profiles"
  ],
  practice: [
    "core.patient_management",
    "core.appointment_calendar",
    "core.doctor_profiles",
    "scheduling.online_booking",
    "scheduling.waitlist",
    "billing.invoices",
    "communication.reminders"
  ],
  "clinic-group": [
    "core.patient_management",
    "core.appointment_calendar",
    "core.doctor_profiles",
    "scheduling.online_booking",
    "scheduling.multi_doctor",
    "scheduling.waitlist",
    "billing.invoices",
    "billing.revenue_reports",
    "billing.insurance",
    "communication.reminders",
    "support.data_export"
  ]
}

export interface ClinicPlanDetails {
  planId: string | null
  planName: string
  planSlug: string
  status: string
  billingCycle: string
  doctorLimit: number | null
  patientLimit: number | null
  activeFeatures: string[]
  isDefaultFree: boolean
  promoId?: string | null
  promoExpiresAt?: Date | null
  trialEndsAt?: Date | null
  cancelAtPeriodEnd?: boolean
  currentPeriodEnd?: Date | null
}

/**
 * Returns full subscription and plan details for a given clinic.
 */
export async function getClinicSubscriptionDetails(clinicId: string): Promise<ClinicPlanDetails> {
  const subscription = await db.subscription.findUnique({
    where: { clinicId },
    include: {
      plan: {
        include: {
          planFeatures: {
            where: { included: true },
            include: { feature: true }
          }
        }
      }
    }
  })

  // If no subscription or plan, fallback to Starter default free plan
  if (!subscription || !subscription.plan) {
    const defaultPlan = await db.plan.findFirst({
      where: { isDefaultFree: true },
      include: {
        planFeatures: {
          where: { included: true },
          include: { feature: true }
        }
      }
    })

    const slug = defaultPlan?.slug || "starter"
    const features = defaultPlan?.planFeatures?.length
      ? defaultPlan.planFeatures.map(pf => pf.feature).filter(f => f.isGloballyEnabled).map(f => f.key)
      : (DEFAULT_TIER_FEATURES[slug] || DEFAULT_TIER_FEATURES.starter)

    return {
      planId: defaultPlan?.id || null,
      planName: defaultPlan?.name || "Starter",
      planSlug: slug,
      status: "ACTIVE",
      billingCycle: "monthly",
      doctorLimit: defaultPlan?.doctorLimit ?? 1,
      patientLimit: defaultPlan?.patientLimit ?? 200,
      activeFeatures: features,
      isDefaultFree: true,
      promoId: null,
      promoExpiresAt: null
    }
  }

  const plan = subscription.plan
  let features = plan.planFeatures
    .map(pf => pf.feature)
    .filter(f => f.isGloballyEnabled)
    .map(f => f.key)

  // Fallback if planFeatures was empty
  if (features.length === 0 && DEFAULT_TIER_FEATURES[plan.slug]) {
    features = DEFAULT_TIER_FEATURES[plan.slug]
  }

  let doctorLimit = plan.doctorLimit
  let patientLimit = plan.patientLimit

  // Feature Override Engine for Active Promos
  if (subscription.promoId && subscription.promoExpiresAt && new Date(subscription.promoExpiresAt).getTime() > Date.now()) {
    const promo = await db.promo.findUnique({
      where: { id: subscription.promoId },
      include: {
        targetPlan: {
          include: {
            planFeatures: {
              where: { included: true },
              include: { feature: true }
            }
          }
        }
      }
    })
    
    if (promo?.targetPlan) {
      features = promo.targetPlan.planFeatures
        .map(pf => pf.feature)
        .filter(f => f.isGloballyEnabled)
        .map(f => f.key)
        
      if (features.length === 0 && DEFAULT_TIER_FEATURES[promo.targetPlan.slug]) {
        features = DEFAULT_TIER_FEATURES[promo.targetPlan.slug]
      }
      
      doctorLimit = promo.targetPlan.doctorLimit
      patientLimit = promo.targetPlan.patientLimit
    }
  }

  return {
    planId: plan.id,
    planName: plan.name,
    planSlug: plan.slug,
    status: subscription.status,
    billingCycle: subscription.billingCycle,
    doctorLimit,
    patientLimit,
    activeFeatures: features,
    isDefaultFree: plan.isDefaultFree,
    promoId: subscription.promoId,
    promoExpiresAt: subscription.promoExpiresAt,
    trialEndsAt: subscription.trialEndsAt,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    currentPeriodEnd: subscription.currentPeriodEnd,
  }
}

/**
 * Returns active feature keys for the given clinic.
 */
export async function getClinicFeatures(clinicId: string): Promise<string[]> {
  const details = await getClinicSubscriptionDetails(clinicId)
  return details.activeFeatures
}

/**
 * Checks whether the given clinic has a specific feature enabled.
 */
export async function hasFeature(clinicId: string, featureKey: string): Promise<boolean> {
  const activeFeatures = await getClinicFeatures(clinicId)
  return activeFeatures.includes(featureKey)
}

/**
 * Checks if the clinic can add another doctor based on their effective limit
 * (plan limit + Extra Doctor Seat plugin quantity).
 */
export async function canAddDoctor(clinicId: string): Promise<{
  allowed: boolean
  current: number
  limit: number | null
  extraSeats: number
  message?: string
}> {
  const { getEffectiveDoctorLimit } = await import("./plugins")
  const details = await getClinicSubscriptionDetails(clinicId)
  const current = await db.doctor.count({ where: { clinicId } })
  const { effectiveLimit, extraSeats } = await getEffectiveDoctorLimit(clinicId, details.doctorLimit)

  if (effectiveLimit !== null && current >= effectiveLimit) {
    const baseMsg = `Your ${details.planName} plan allows ${details.doctorLimit} base doctor${details.doctorLimit === 1 ? "" : "s"}`
    const extraMsg = extraSeats > 0 ? ` + ${extraSeats} extra seat${extraSeats > 1 ? "s" : ""}` : ""
    return {
      allowed: false,
      current,
      limit: effectiveLimit,
      extraSeats,
      message: `${baseMsg}${extraMsg} (${effectiveLimit} total). Purchase more Extra Doctor Seats or upgrade your plan.`
    }
  }

  return {
    allowed: true,
    current,
    limit: effectiveLimit,
    extraSeats,
  }
}

/**
 * Checks if the clinic can add another patient based on their plan limit.
 */
export async function canAddPatient(clinicId: string): Promise<{ allowed: boolean; current: number; limit: number | null; message?: string }> {
  const details = await getClinicSubscriptionDetails(clinicId)
  const current = await db.patient.count({ where: { clinicId } })

  if (details.patientLimit !== null && current >= details.patientLimit) {
    return {
      allowed: false,
      current,
      limit: details.patientLimit,
      message: `You have reached the maximum of ${details.patientLimit} patients on the ${details.planName} plan. Upgrade to add more.`
    }
  }

  return {
    allowed: true,
    current,
    limit: details.patientLimit
  }
}
