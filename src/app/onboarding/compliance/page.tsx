import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ComplianceForm } from "./ComplianceForm"

export default async function OnboardingCompliancePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id }
  })

  const clinic = user?.activeClinicId 
    ? await db.clinic.findUnique({ where: { id: user.activeClinicId } })
    : null

  if (!clinic) redirect("/onboarding/clinic")

  return (
    <div>
      <div className="border-b border-line px-8 py-6 bg-paper">
        <h2 className="text-[21px] font-bold m-0">Compliance & Billing Details</h2>
        <p className="text-[14.5px] text-ink-soft m-0 mt-1">
          Provide regional tax and regulatory identifiers for invoices.
        </p>
      </div>

      <div className="p-8">
        <ComplianceForm country={clinic.country} />
      </div>
    </div>
  )
}
