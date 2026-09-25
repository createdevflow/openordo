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
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-line py-4 px-6 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {config?.logoUrl ? (
            <img src={config.logoUrl} alt={clinic.name} className="h-8" />
          ) : (
            <div className="w-8 h-8 bg-forest text-white rounded flex items-center justify-center font-bold text-sm">
              {clinic.name.charAt(0)}
            </div>
          )}
          <span className="font-semibold text-ink hidden sm:block">{clinic.name} Patient Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-ink flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-forest-soft text-forest flex items-center justify-center font-bold">
              {patient.name.charAt(0)}
            </div>
            <span className="hidden sm:block">{patient.name}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <PatientPortalClient 
          patient={patient} 
          clinic={clinic} 
          accentColor={config?.accentColor || "#1E4638"} 
        />
      </main>
    </div>
  )
}
