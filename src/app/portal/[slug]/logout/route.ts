import { db } from "@/lib/db"
import { clearPatientSession } from "@/lib/patient-auth"
import { redirect } from "next/navigation"

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const clinic = await db.clinic.findUnique({ where: { slug: resolvedParams.slug } })
  if (clinic) {
    await clearPatientSession(clinic.id)
  }
  
  redirect(`/portal/${resolvedParams.slug}/login`)
}
