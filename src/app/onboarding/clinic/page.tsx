import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { ClinicForm } from "./ClinicForm"

export default async function OnboardingClinicPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const activeCountries = await db.taxCountryConfig.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" }
  })

  return (
    <div>
      <div className="border-b border-line px-8 py-6 bg-paper">
        <h2 className="text-[21px] font-bold m-0">Set up your clinic</h2>
        <p className="text-[14.5px] text-ink-soft m-0 mt-1">
          Tell us about your practice. You can change this later.
        </p>
      </div>

      <div className="p-8">
        <ClinicForm activeCountries={activeCountries} />
      </div>
    </div>
  )
}

