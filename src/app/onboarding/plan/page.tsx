import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { PlanForm } from "./PlanForm"
import { headers, cookies } from "next/headers"

export default async function OnboardingPlanPage() {
  const session = await auth()
  const headersList = await headers()
  const cookieStore = await cookies()
  const initialPlan = cookieStore.get("selected_plan")?.value
  let country = headersList.get('x-user-country') || 'US'

  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        activeClinicId: true,
        phone: true,
        memberships: {
          include: { clinic: { select: { country: true } } },
          take: 1
        }
      }
    })
    
    // If clinic's country was selected as India during step 1 or user registered with Indian phone (+91)
    const clinicCountry = user?.memberships[0]?.clinic?.country
    if (clinicCountry === 'IN' || user?.phone?.startsWith('+91')) {
      country = 'IN'
    }
  }

  const currency = country === 'IN' ? 'INR' : 'USD'

  const rawPlans = await db.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      planFeatures: {
        where: { included: true },
        include: { feature: true }
      }
    }
  })

  const plans = rawPlans.map(p => {
    let customBullets: string[] = []
    try {
      if (p.features) {
        customBullets = JSON.parse(p.features)
      }
    } catch {}

    const catalogFeatures = (p.planFeatures || [])
      .filter(pf => pf.feature?.isGloballyEnabled)
      .map(pf => pf.feature.name)

    let displayFeatures: string[] = []
    if (customBullets.length > 0) {
      displayFeatures = customBullets
    } else if (p.name.toLowerCase().includes("starter")) {
      displayFeatures = [
        "1 Doctor account",
        "Up to 250 patient records",
        "Visual appointment calendar",
        "Patient medical history",
        "Doctor profile & schedule",
        "Automated daily backups",
      ]
    } else if (p.name.toLowerCase().includes("practice")) {
      displayFeatures = [
        "Up to 5 Doctor accounts",
        "Unlimited patient records",
        "Visual appointment calendar",
        "Online booking page",
        "Invoicing & billing",
        "Automated SMS/email reminders",
        "Waitlist management",
      ]
    } else if (p.name.toLowerCase().includes("group")) {
      displayFeatures = [
        "Unlimited Doctor accounts",
        "Unlimited patient records",
        "All Practice plan features",
        "Multi-doctor simultaneous scheduling",
        "Insurance tracking & processing",
        "Revenue reports & analytics export",
        "Clinic data export (CSV/PDF)",
      ]
    } else if (catalogFeatures.length > 0) {
      displayFeatures = catalogFeatures
    } else {
      displayFeatures = [
        "Patient management",
        "Appointment calendar",
        "Doctor profiles",
      ]
    }

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      priceMonthlyUsd: p.priceMonthlyUsd,
      priceYearlyUsd: p.priceYearlyUsd,
      priceMonthlyInr: p.priceMonthlyInr,
      priceYearlyInr: p.priceYearlyInr,
      patientLimit: p.patientLimit,
      doctorLimit: p.doctorLimit,
      isFeatured: p.isFeatured,
      isDefaultFree: p.isDefaultFree,
      featureList: displayFeatures,
    }
  })

  let promo = null
  try {
    promo = await db.promo.findFirst({
      where: {
        isActive: true,
        eligibility: "NEW_CLINICS_ONLY"
      }
    })
  } catch (e) {
    console.error("Failed to fetch promo from DB", e)
  }

  return (
    <div className="bg-paper-raised rounded-card border border-line overflow-hidden shadow-sm">
      <div className="border-b border-line px-8 py-6 bg-paper">
        <h2 className="text-[22px] font-bold m-0 text-ink">Choose your plan</h2>
        <p className="text-[14.5px] text-ink-soft m-0 mt-1">
          Select a subscription plan for your clinic. You can change or upgrade anytime.
        </p>
      </div>

      <div className="p-6 md:p-8">
        <PlanForm plans={plans} promo={promo} currency={currency} initialPlan={initialPlan} />
      </div>
    </div>
  )
}
