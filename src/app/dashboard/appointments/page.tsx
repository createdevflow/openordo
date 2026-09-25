import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { hasFeature, getClinicSubscriptionDetails } from "@/lib/features"
import { hasActivePlugin } from "@/lib/plugins"
import { FeatureGate } from "@/components/ui/FeatureGate"
import { AppointmentsClient } from "./AppointmentsClient"

export default async function AppointmentsPage() {
  const clinicId = await requireClinicId()

  if (!(await hasFeature(clinicId, "core.appointment_calendar"))) {
    return <FeatureGate featureName="Appointment Calendar" />
  }

  const [appointments, patients, doctors, planDetails, hasVideoPlugin, hasWhatsAppPlugin] = await Promise.all([
    db.appointment.findMany({ where: { clinicId } }),
    db.patient.findMany({ where: { clinicId }, orderBy: { name: 'asc' } }),
    db.doctor.findMany({ where: { clinicId }, orderBy: { name: 'asc' } }),
    getClinicSubscriptionDetails(clinicId),
    hasActivePlugin(clinicId, "video-consultation"),
    hasActivePlugin(clinicId, "whatsapp-reminders")
  ])

  return (
    <AppointmentsClient 
      appointments={appointments}
      patients={patients}
      doctors={doctors}
      hasMultiDoctor={planDetails.activeFeatures.includes("scheduling.multi_doctor")}
      planName={planDetails.planName}
      hasVideoPlugin={hasVideoPlugin}
      hasWhatsAppPlugin={hasWhatsAppPlugin}
    />
  )
}
