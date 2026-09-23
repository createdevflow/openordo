import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { getClinicSubscriptionDetails } from "@/lib/features"
import { getStorageStats } from "@/server/actions/documents"
import { OverviewClient } from "./OverviewClient"

export default async function DashboardOverviewPage() {
  const clinicId = await requireClinicId()

  const [clinic, patients, appointments, invoices, doctors, planDetails, storageStats] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId } }),
    db.patient.findMany({ where: { clinicId }, orderBy: { createdAt: 'desc' } }),
    db.appointment.findMany({ where: { clinicId } }),
    db.invoice.findMany({ where: { clinicId } }),
    db.doctor.findMany({ where: { clinicId } }),
    getClinicSubscriptionDetails(clinicId),
    getStorageStats()
  ])

  return (
    <OverviewClient 
      clinic={clinic}
      patients={patients}
      appointments={appointments}
      invoices={invoices}
      doctors={doctors}
      planDetails={planDetails}
      storageStats={storageStats}
    />
  )
}
