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
  bookingPageLimit: number | null
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
      bookingPageLimit: defaultPlan?.bookingPageLimit ?? null,
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
  let bookingPageLimit = plan.bookingPageLimit

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
      bookingPageLimit = promo.targetPlan.bookingPageLimit
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
    bookingPageLimit,
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

/**
 * Returns booking usage stats and limit info for a clinic.
 * Counts bookings created in the current calendar month.
 * Extra capacity from "booking-capacity" LIMIT_MODIFIER addons is also counted.
 */
export async function getBookingUsage(clinicId: string): Promise<{
  current: number
  limit: number | null          // null = unlimited
  extraCapacity: number
  effectiveLimit: number | null
  planName: string
  nearingLimit: boolean         // >= 80%
  overLimit: boolean
}> {
  const details = await getClinicSubscriptionDetails(clinicId)

  // Count bookings in the current month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const current = await db.bookingRequest.count({
    where: { clinicId, createdAt: { gte: monthStart } }
  })

  // Extra capacity from addon
  const addon = await db.clinicPlugin.findFirst({
    where: {
      clinicId,
      status: "ACTIVE",
      plugin: { slug: "booking-capacity" }
    },
    include: { plugin: true }
  })
  const extraCapacity = addon ? addon.quantity * 50 : 0 // each unit = 50 extra bookings/month

  const basePlanLimit = details.bookingPageLimit
  const effectiveLimit = basePlanLimit !== null ? basePlanLimit + extraCapacity : null

  return {
    current,
    limit: basePlanLimit,
    extraCapacity,
    effectiveLimit,
    planName: details.planName,
    nearingLimit: effectiveLimit !== null && current >= Math.floor(effectiveLimit * 0.8),
    overLimit: effectiveLimit !== null && current >= effectiveLimit
  }
}

/**
 * Checks if the clinic can accept a new booking entry right now.
 */
export async function canAcceptBooking(clinicId: string): Promise<{
  allowed: boolean
  current: number
  effectiveLimit: number | null
  message?: string
}> {
  const usage = await getBookingUsage(clinicId)
  if (usage.overLimit) {
    return {
      allowed: false,
      current: usage.current,
      effectiveLimit: usage.effectiveLimit,
      message: `You have reached your monthly booking limit of ${usage.effectiveLimit} on the ${usage.planName} plan.`
    }
  }
  return { allowed: true, current: usage.current, effectiveLimit: usage.effectiveLimit }
}
