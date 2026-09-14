import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { StaffForm } from "./StaffForm"

export default async function OnboardingStaffPage() {
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
        <h2 className="text-[21px] font-bold m-0">Add your first Doctor</h2>
        <p className="text-[14.5px] text-ink-soft m-0 mt-1">
          Add a practitioner to start scheduling appointments. You can add more later.
        </p>
      </div>

      <div className="p-8">
        <StaffForm userName={user?.name || ""} userEmail={user?.email || ""} />
      </div>
    </div>
  )
}
