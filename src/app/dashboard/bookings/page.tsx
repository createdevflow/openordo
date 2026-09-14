import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { hasFeature } from "@/lib/features"
import { FeatureGate } from "@/components/ui/FeatureGate"
import { BookingsClient } from "./BookingsClient"

export const metadata = { title: "Booking Requests — OpenORDO" }

export default async function BookingsPage() {
  const clinicId = await requireClinicId()

  if (!(await hasFeature(clinicId, "scheduling.online_booking"))) {
    return <FeatureGate featureName="Online Booking" />
  }

  const [bookings, doctors] = await Promise.all([
    db.bookingRequest.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" }
    }),
    db.doctor.findMany({ where: { clinicId }, orderBy: { name: "asc" } })
  ])

  return <BookingsClient bookings={bookings} doctors={doctors} />
}
