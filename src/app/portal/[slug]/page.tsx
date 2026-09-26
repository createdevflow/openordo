import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { getPatientAccountSession } from "@/lib/patient-auth"
import { PatientPortalClient } from "./PatientPortalClient"

export default async function PatientPortalPage({ params }: { params: Promise<{ slug: string }> }) {
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

  // Isolation: resolve Patient data via PatientAccountLink — never bare patientId
  const link = await db.patientAccountLink.findUnique({
    where: {
      patientAccountId_clinicId: {
        patientAccountId: session.patientAccountId,
        clinicId: clinic.id
      }
    },
    include: {
      patient: {
        include: {
          appointments: {
            include: { doctor: true },
            orderBy: { date: "desc" }
          },
          records: {
            include: { doctor: true },
            orderBy: { date: "desc" }
          },
          prescriptions: {
            include: { doctor: true },
            orderBy: { date: "desc" }
          },
          invoices: {
            orderBy: { date: "desc" }
          },
          PatientDocument: {
            orderBy: { createdAt: "desc" }
          }
        }
      }
    }
  })

  if (!link) {
    // Patient account exists but no record at this clinic
    redirect(`/portal/${resolvedParams.slug}/login`)
  }

  // Fetch all clinics this account is linked to (for clinic switcher)
  const allLinks = await db.patientAccountLink.findMany({
    where: { patientAccountId: session.patientAccountId },
    include: { clinic: { include: { bookingPageConfig: true } } }
  })

  const linkedClinics = allLinks.map(l => ({
    id: l.clinic.id,
    name: l.clinic.name,
    slug: l.clinic.slug,
    accentColor: l.clinic.bookingPageConfig?.accentColor || "#1E4638",
    logoUrl: l.clinic.bookingPageConfig?.logoUrl || null
  }))

  const account = await db.patientAccount.findUnique({
    where: { id: session.patientAccountId },
    select: { id: true, name: true, email: true, phone: true }
  })

  const config = clinic.bookingPageConfig

  return (
    <PatientPortalClient
      patient={link.patient}
      clinic={clinic}
      account={account}
      accentColor={config?.accentColor || "#1E4638"}
      logoUrl={config?.logoUrl}
      linkedClinics={linkedClinics}
      shareRecords={clinic.shareRecordsWithPatients}
    />
  )
}
