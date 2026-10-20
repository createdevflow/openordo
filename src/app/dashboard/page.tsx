import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { getClinicSubscriptionDetails } from "@/lib/features"
import { getStorageStats } from "@/server/actions/documents"
import { OverviewClient } from "./OverviewClient"

import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default async function DashboardOverviewPage() {
  const clinicId = await requireClinicId()

  const [
    clinic,
    patients,
    appointments,
    invoices,
    doctors,
    planDetails,
    storageStats,
    clinicPlugins,
    inventoryItems,
    prescriptions
  ] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId } }),
    db.patient.findMany({ where: { clinicId }, orderBy: { createdAt: 'desc' } }),
    db.appointment.findMany({ where: { clinicId } }),
    db.invoice.findMany({ where: { clinicId } }),
    db.doctor.findMany({ where: { clinicId } }),
    getClinicSubscriptionDetails(clinicId),
    getStorageStats(),
    db.clinicPlugin.findMany({
      where: { clinicId, status: "ACTIVE", isEnabled: true },
      include: { plugin: true }
    }),
    db.inventoryItem.findMany({ where: { clinicId } }).catch(() => []),
    db.prescription.findMany({ where: { clinicId } }).catch(() => [])
  ])

  // Calculate extra doctor seats from active plugins (e.g. extra-doctor-seat)
  const extraDoctorSeats = clinicPlugins
    .filter(cp => cp.plugin.slug === "extra-doctor-seat")
    .reduce((acc, cp) => acc + (cp.quantity || 1), 0)

  const effectiveDoctorLimit = planDetails.doctorLimit === null
    ? null
    : planDetails.doctorLimit + extraDoctorSeats

  return (
    <OverviewClient 
      clinic={clinic}
      patients={patients}
      appointments={appointments}
      invoices={invoices}
      doctors={doctors}
      planDetails={planDetails}
      storageStats={storageStats}
      clinicPlugins={clinicPlugins}
      extraDoctorSeats={extraDoctorSeats}
      effectiveDoctorLimit={effectiveDoctorLimit}
      inventoryItems={inventoryItems}
      prescriptions={prescriptions}
    />
  )
}
