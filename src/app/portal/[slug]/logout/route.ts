import { clearPatientAccountSession } from "@/lib/patient-auth"
import { redirect } from "next/navigation"

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  await clearPatientAccountSession()
  redirect(`/portal/${resolvedParams.slug}/login`)
}
