import { db } from "@/lib/db"
import { headers } from "next/headers"
import { LandingPricingSection, PlanItem } from "../LandingPricingSection"

export default async function PricingPage() {
  const headersList = await headers()
  const country = headersList.get("x-user-country") || "US"
  const initialCurrency = country === "IN" ? "INR" : "USD"

  let dbPlans: any[] = []
  let defaultTrialDays = 14
  try {
    dbPlans = await db.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        planFeatures: {
          where: { included: true },
          include: { feature: true },
          orderBy: { feature: { name: "asc" } }
        }
      }
    })
    const trialSetting = await db.globalSetting.findUnique({ where: { key: "DEFAULT_TRIAL_DAYS" } })
    if (trialSetting) defaultTrialDays = parseInt(trialSetting.value, 10)
  } catch (e) {
    console.error("Failed to fetch plans from DB", e)
  }

  // Fallback to real default plans if DB query fails
  if (!dbPlans || dbPlans.length === 0) {
    dbPlans = [
      { id: "free", name: "Free", slug: "free", priceMonthlyUsd: 0, priceMonthlyInr: 0, patientLimit: 200, doctorLimit: 1, isFeatured: false, planFeatures: [] },
      { id: "practice", name: "Practice", slug: "practice", priceMonthlyUsd: 39, priceMonthlyInr: 1990, patientLimit: null, doctorLimit: 6, isFeatured: true, planFeatures: [] },
      { id: "clinic", name: "Clinic", slug: "clinic", priceMonthlyUsd: 89, priceMonthlyInr: 4990, patientLimit: null, doctorLimit: null, isFeatured: false, planFeatures: [] }
    ]
  }

  const plans: PlanItem[] = dbPlans.map((p: any) => {
    // 1. Admin-assigned features from the feature catalog
    const catalogFeatures: string[] = (p.planFeatures || [])
      .filter((pf: any) => pf.feature?.isGloballyEnabled !== false)
      .map((pf: any) => pf.feature?.name || "")
      .filter(Boolean)

    // 2. Append custom marketing bullets
    let customBullets: string[] = []
    try {
      if (p.features) {
        const parsed = JSON.parse(p.features)
        if (Array.isArray(parsed)) customBullets = parsed
      }
    } catch (e) {}

    let featuresList = [...catalogFeatures, ...customBullets]

    // Always append storage limit if defined
    if (p.storageLimitGb) {
      featuresList.push(`${p.storageLimitGb} GB document storage`)
    }

    // 3. Hardcoded fallback only if nothing defined in admin
    if (featuresList.length === 0) {
      const slug = (p.slug || p.name || "").toLowerCase()
      if (slug.includes("free") || slug.includes("starter")) {
        featuresList = [
          p.doctorLimit ? `Up to ${p.doctorLimit} doctor login` : "1 Doctor account",
          p.patientLimit ? `Up to ${p.patientLimit} patient records` : "Basic patient records",
          "Appointment calendar",
          "Patient medical history & charts",
        ]
      } else if (slug.includes("practice")) {
        featuresList = [
          p.doctorLimit ? `Up to ${p.doctorLimit} doctor accounts` : "Multiple doctor accounts",
          "Unlimited patient records & charts",
          "Online booking page",
          "Invoicing & billing",
        ]
      } else {
        featuresList = [
          "Unlimited doctor accounts",
          "Unlimited patient records & charts",
          "All lower plan features included",
          "Revenue analytics",
          "Data export (CSV/PDF)",
        ]
      }
    }

    return {
      id: p.id,
      name: p.name,
      slug: p.slug || (p.name || "").toLowerCase(),
      description: p.description || "",
      priceMonthlyUsd: p.priceMonthlyUsd,
      priceMonthlyInr: p.priceMonthlyInr,
      patientLimit: p.patientLimit,
      doctorLimit: p.doctorLimit,
      storageLimitGb: p.storageLimitGb,
      isFeatured: Boolean(p.isFeatured),
      featuresList
    }
  })

  let promo = null
  try {
    promo = await db.promo.findFirst({
      where: {
        isActive: true,
        OR: [
          { eligibility: "NEW_CLINICS_ONLY" },
          { eligibility: "ALL_CLINICS" }
        ]
      }
    })
  } catch (e) {}

  return (
    <div className="py-16">
      <LandingPricingSection 
        plans={plans} 
        promo={promo} 
        initialCurrency={initialCurrency as "USD" | "INR"} 
        defaultTrialDays={defaultTrialDays}
      />
    </div>
  )
}
