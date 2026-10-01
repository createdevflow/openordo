import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { getPatientAccountSession } from "@/lib/patient-auth"
import { PatientConsentForm } from "./PatientConsentForm"
import { hasUserConsented } from "@/server/actions/consent"

export default async function PatientConsentPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const session = await getPatientAccountSession()

  if (!session) {
    redirect(`/portal/${resolvedParams.slug}/login`)
  }

  const clinic = await db.clinic.findUnique({
    where: { slug: resolvedParams.slug },
    include: { bookingPageConfig: true }
  })

  if (!clinic || clinic.status !== "ACTIVE") {
    notFound()
  }

  // If already consented, send them to portal home
  const alreadyConsented = await db.consentRecord.findFirst({
    where: { ownerType: "PATIENT_ACCOUNT", ownerId: session.patientAccountId, documentType: "PRIVACY" }
  })
  if (alreadyConsented) {
    redirect(`/portal/${resolvedParams.slug}`)
  }

  const account = await db.patientAccount.findUnique({
    where: { id: session.patientAccountId },
    select: { name: true }
  })

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper)", padding: 24 }}>
      <PatientConsentForm 
        clinicSlug={clinic.slug}
        clinicName={clinic.bookingPageConfig?.displayName || clinic.name}
        patientName={account?.name || "Patient"}
        patientAccountId={session.patientAccountId}
      />
    </div>
  )
}
