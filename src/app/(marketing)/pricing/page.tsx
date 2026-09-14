import { db } from "@/lib/db"
import { headers } from "next/headers"
import { LandingPricingSection, PlanItem } from "../LandingPricingSection"

export default async function PricingPage() {
  const headersList = await headers()
  const country = headersList.get("x-user-country") || "US"
  const initialCurrency = country === "IN" ? "INR" : "USD"

  let dbPlans: any[] = []
  try {
    dbPlans = await db.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" }
    })
  } catch (e) {
    console.error("Failed to fetch plans from DB", e)
  }

  // Fallback to real default plans if DB query fails
  if (!dbPlans || dbPlans.length === 0) {
    dbPlans = [
      { id: "starter", name: "Starter", slug: "starter", priceMonthlyUsd: 0, priceMonthlyInr: 0, patientLimit: 200, doctorLimit: 1, isFeatured: false },
      { id: "practice", name: "Practice", slug: "practice", priceMonthlyUsd: 39, priceMonthlyInr: 1990, patientLimit: null, doctorLimit: 6, isFeatured: true },
      { id: "clinic-group", name: "Clinic Group", slug: "clinic-group", priceMonthlyUsd: 89, priceMonthlyInr: 4990, patientLimit: null, doctorLimit: null, isFeatured: false }
    ]
  }

  const plans: PlanItem[] = dbPlans.map((p: any) => {
    let featuresList: string[] = []
    const slug = (p.slug || p.name || "").toLowerCase()

    if (slug.includes("starter")) {
      featuresList = [
        "1 Doctor account",
        `Up to ${p.patientLimit || 200} patient records`,
        "Visual appointment calendar",
        "Patient medical history & charts",
        "Doctor profile & working hours",
        "Automated daily data backups"
      ]
    } else if (slug.includes("practice")) {
      featuresList = [
        `Up to ${p.doctorLimit || 6} Doctor accounts`,
        "Unlimited patient records & charts",
        "Visual appointment calendar",
        "Public online booking page link",
        "Invoicing & itemized billing",
        "Automated SMS & email reminders",
        "Automated waitlist management"
      ]
    } else {
      featuresList = [
        "Unlimited Doctor accounts",
        "Unlimited patient records & charts",
        "All Practice plan features included",
        "Multi-doctor simultaneous scheduling",
        "Insurance tracking & claims",
        "Monthly & annual revenue analytics",
        "Clinic data export (CSV/PDF)",
        "Dedicated priority onboarding"
      ]
    }

    return {
      id: p.id,
      name: p.name,
      slug: p.slug || slug,
      description: p.description || "",
      priceMonthlyUsd: p.priceMonthlyUsd,
      priceMonthlyInr: p.priceMonthlyInr,
      patientLimit: p.patientLimit,
      doctorLimit: p.doctorLimit,
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
      />
    </div>
  )
}
