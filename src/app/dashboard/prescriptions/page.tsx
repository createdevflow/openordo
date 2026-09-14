import { requireClinicId } from "@/lib/auth-utils"
import { hasActivePlugin } from "@/lib/plugins"
import { db } from "@/lib/db"
import { PluginUpsellCard } from "@/components/ui/PluginCard"
import { PrescriptionsClient } from "./PrescriptionsClient"

export default async function PrescriptionsPage({ searchParams }: { searchParams: Promise<{ action?: string, patientId?: string }> }) {
  const clinicId = await requireClinicId()
  const resolvedParams = await searchParams

  const hasPlugin = await hasActivePlugin(clinicId, "e-prescriptions")

  if (!hasPlugin) {
    return (
      <div className="cw" style={{ padding: "32px 24px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Prescriptions</h1>
        <PluginUpsellCard
          slug="e-prescriptions"
          name="E-Prescriptions"
          tagline="Digital, branded prescriptions with drug dosage and print-ready PDF export."
        />
      </div>
    )
  }

  const [prescriptions, patients, doctors, clinic] = await Promise.all([
    db.prescription.findMany({
      where: { clinicId },
      include: {
        patient: true,
        doctor: true
      },
      orderBy: { createdAt: "desc" }
    }),
    db.patient.findMany({ where: { clinicId }, orderBy: { name: "asc" } }),
    db.doctor.findMany({ where: { clinicId }, orderBy: { name: "asc" } }),
    db.clinic.findUnique({ where: { id: clinicId } })
  ])

  return (
    <PrescriptionsClient
      prescriptions={prescriptions}
      patients={patients}
      doctors={doctors}
      clinic={clinic}
      initialAction={resolvedParams?.action}
      initialPatientId={resolvedParams?.patientId}
    />
  )
}
