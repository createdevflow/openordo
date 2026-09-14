import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { hasFeature, getClinicSubscriptionDetails } from "@/lib/features"
import { FeatureGate } from "@/components/ui/FeatureGate"
import { PatientsClient } from "./PatientsClient"

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const clinicId = await requireClinicId()
  const resolvedParams = await searchParams

  if (!(await hasFeature(clinicId, "core.patient_management"))) {
    return <FeatureGate featureName="Patient Management" />
  }

  const [patients, appointments, records, invoices, doctors, planDetails] = await Promise.all([
    db.patient.findMany({ where: { clinicId }, orderBy: { name: 'asc' } }),
    db.appointment.findMany({ where: { clinicId } }),
    db.medicalRecord.findMany({ where: { clinicId } }),
    db.invoice.findMany({ where: { clinicId } }),
    db.doctor.findMany({ where: { clinicId } }),
    getClinicSubscriptionDetails(clinicId)
  ])

  return (
    <PatientsClient 
      initialPatients={patients} 
      appointments={appointments}
      records={records}
      invoices={invoices}
      doctors={doctors}
      initialSearch={resolvedParams?.search || ""}
      patientLimit={planDetails.patientLimit}
      planName={planDetails.planName}
      hasBilling={planDetails.activeFeatures.includes("billing.invoices")}
    />
  )
}
