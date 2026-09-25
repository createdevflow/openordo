import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { PatientLoginClient } from "./PatientLoginClient"
import { getPatientSession } from "@/lib/patient-auth"

export default async function PatientPortalLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const clinic = await db.clinic.findUnique({
    where: { slug: resolvedParams.slug },
    include: { bookingPageConfig: true }
  })

  if (!clinic || clinic.status !== "ACTIVE") {
    notFound()
  }

  const session = await getPatientSession(clinic.id)
  if (session) {
    redirect(`/portal/${resolvedParams.slug}`)
  }

  const config = clinic.bookingPageConfig

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-line p-8">
        <div className="text-center mb-8">
          {config?.logoUrl ? (
            <img src={config.logoUrl} alt={clinic.name} className="h-12 mx-auto mb-4" />
          ) : (
            <div className="w-12 h-12 bg-forest text-white rounded-lg flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              {clinic.name.charAt(0)}
            </div>
          )}
          <h1 className="text-2xl font-bold text-ink mb-2">Patient Portal</h1>
          <p className="text-ink-soft">Access your medical records and appointments at {clinic.name}.</p>
        </div>

        <PatientLoginClient clinicId={clinic.id} slug={resolvedParams.slug} accentColor={config?.accentColor || "#1E4638"} />
      </div>
    </div>
  )
}
