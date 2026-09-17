import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

export async function requireClinicId() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return redirect("/login")
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  
  if (!user) {
    return redirect("/login")
  }

  // Strictly restrict dashboard access to fully onboarded users
  if (user.onboardingStep !== "COMPLETED" && user.platformRole !== "SUPER_ADMIN") {
    if (user.onboardingStep === "CLINIC_DETAILS") return redirect("/onboarding/clinic")
    if (user.onboardingStep === "COMPLIANCE") return redirect("/onboarding/compliance")
    if (user.onboardingStep === "STAFF") return redirect("/onboarding/staff")
    if (user.onboardingStep === "PLAN_SELECTION") return redirect("/onboarding/plan")
    if (user.onboardingStep === "PAYMENT_SETUP") return redirect("/onboarding/plan/payment")
    return redirect("/onboarding/clinic")
  }

  const clinicId = user.activeClinicId

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
