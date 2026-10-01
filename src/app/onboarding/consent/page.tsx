import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ConsentForm } from "./ConsentForm"

export default async function StaffConsentPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id }
  })
  if (!user) redirect("/login")

  // Check if they already consented
  const existing = await db.consentRecord.findFirst({
    where: { ownerType: "USER", ownerId: user.id, documentType: "TERMS" }
  })

  if (existing) {
    redirect("/dashboard")
  }

  return (
    <div>
      <div className="border-b border-line px-8 py-6 bg-paper">
        <h2 className="text-[21px] font-bold m-0">Legal Agreements</h2>
        <p className="text-[14.5px] text-ink-soft m-0 mt-1">
          Please accept our updated terms and conditions to continue.
        </p>
      </div>
      <div className="p-8">
        <ConsentForm userId={user.id} />
      </div>
    </div>
  )
}
