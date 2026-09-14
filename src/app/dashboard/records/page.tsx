import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { hasFeature } from "@/lib/features"
import { FeatureGate } from "@/components/ui/FeatureGate"
import { RecordsClient } from "./RecordsClient"

export default async function RecordsPage() {
  const clinicId = await requireClinicId()

  if (!(await hasFeature(clinicId, "core.patient_management"))) {
    return <FeatureGate featureName="Medical Records" />
  }

  const [records, patients, doctors, clinic] = await Promise.all([
    db.medicalRecord.findMany({ where: { clinicId } }),
    db.patient.findMany({ where: { clinicId }, orderBy: { name: 'asc' } }),
    db.doctor.findMany({ where: { clinicId }, orderBy: { name: 'asc' } }),
    db.clinic.findUnique({ where: { id: clinicId } })
  ])

  return (
    <RecordsClient 
      records={records}
      patients={patients}
      doctors={doctors}
      clinic={clinic}
    />
  )
}
