import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { getPatientSession } from "@/lib/patient-auth"
import { PatientPortalClient } from "./PatientPortalClient"

export default async function PatientPortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const clinic = await db.clinic.findUnique({
    where: { slug: resolvedParams.slug },
    include: { bookingPageConfig: true }
  })

  if (!clinic || clinic.status !== "ACTIVE") {
    notFound()
  }

  const session = await getPatientSession(clinic.id)
  if (!session) {
    redirect(`/portal/${resolvedParams.slug}/login`)
  }

  const patient = await db.patient.findUnique({
    where: { id: session.patientId },
    include: {
      appointments: {
        include: { doctor: true },
        orderBy: { date: 'desc' }
      },
      records: {
        include: { doctor: true },
        orderBy: { date: 'desc' }
      },
      prescriptions: {
        include: { doctor: true },
        orderBy: { date: 'desc' }
      },
      invoices: {
        orderBy: { date: 'desc' }
      },
      PatientDocument: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!patient) {
    // Session is invalid or patient deleted
    redirect(`/portal/${resolvedParams.slug}/login`)
  }

  const config = clinic.bookingPageConfig

  return (
    <PatientPortalClient 
      patient={patient} 
      clinic={clinic} 
      accentColor={config?.accentColor || "#1E4638"} 
      logoUrl={config?.logoUrl}
    />
  )
}
