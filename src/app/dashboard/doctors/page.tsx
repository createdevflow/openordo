import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { hasFeature, getClinicSubscriptionDetails } from "@/lib/features"
import { FeatureGate } from "@/components/ui/FeatureGate"
import { DoctorsClient } from "./DoctorsClient"

export default async function DoctorsPage() {
  const clinicId = await requireClinicId()

  if (!(await hasFeature(clinicId, "core.doctor_profiles"))) {
    return <FeatureGate featureName="Doctor Profiles" />
  }

  const [doctors, appointments, planDetails] = await Promise.all([
    db.doctor.findMany({ where: { clinicId }, orderBy: { name: 'asc' } }),
    db.appointment.findMany({ where: { clinicId } }),
    getClinicSubscriptionDetails(clinicId)
  ])

  return (
    <DoctorsClient 
      doctors={doctors}
      appointments={appointments}
      doctorLimit={planDetails.doctorLimit}
      planName={planDetails.planName}
    />
  )
}
