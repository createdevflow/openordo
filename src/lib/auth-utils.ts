import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

export async function requireClinicId() {
  const session = await auth()
  
  let clinicId = session?.user?.clinicId
  if (!clinicId && session?.user?.id) {
    const user = await db.user.findUnique({ where: { id: session.user.id } })
    clinicId = user?.activeClinicId
  }

  if (!clinicId) {
    return redirect("/onboarding/clinic")
  }

  return clinicId
}
export async function requireUser() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return redirect("/login")
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return redirect("/login")
  }

  return user
}
