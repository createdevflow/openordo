import { db } from "@/lib/db"
import { requireClinicId, requireUser } from "@/lib/auth-utils"
import { getClinicSubscriptionDetails } from "@/lib/features"
import { SettingsClient } from "./SettingsClient"

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser()
  const clinicId = await requireClinicId()
  const resolvedParams = await searchParams

  const [clinic, planDetails, allPlans] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId } }),
    getClinicSubscriptionDetails(clinicId),
    db.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        planFeatures: {
          where: { included: true },
          include: { feature: true }
        }
      }
    })
  ])

  return (
    <SettingsClient 
      initialClinic={clinic}
      initialUser={user}
      planDetails={planDetails}
      allPlans={allPlans}
      initialTab={resolvedParams?.tab || "clinic"}
    />
  )
}
