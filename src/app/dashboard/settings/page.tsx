import { db } from "@/lib/db"
import { requireClinicId, requireUser } from "@/lib/auth-utils"
import { getClinicSubscriptionDetails } from "@/lib/features"
import { hasActivePlugin } from "@/lib/plugins"
import { SettingsClient } from "./SettingsClient"

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser()
  const clinicId = await requireClinicId()
  const resolvedParams = await searchParams

  // Guard: db.bookingPageConfig may not exist on older Prisma client builds.
  // Runs fine once `prisma generate` is executed with the dev server stopped.
  const safeBookingConfig = async () => {
    try {
      return await (db as any).bookingPageConfig?.findUnique({ where: { clinicId } }) ?? null
    } catch { return null }
  }

  const [clinic, planDetails, allPlans, hasBrandedBooking, bookingPageConfig, doctors] = await Promise.all([
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
    }),
    hasActivePlugin(clinicId, "branded-booking-page").catch(() => false),
    safeBookingConfig(),
    db.doctor.findMany({ where: { clinicId }, orderBy: { name: "asc" }, select: { id: true, name: true, specialty: true } }),
  ])


  return (
    <SettingsClient 
      initialClinic={clinic}
      initialUser={user}
      planDetails={planDetails}
      allPlans={allPlans}
      initialTab={resolvedParams?.tab || "clinic"}
      hasBrandedBooking={hasBrandedBooking}
      initialBookingConfig={bookingPageConfig}
      doctors={doctors}
    />
  )
}
