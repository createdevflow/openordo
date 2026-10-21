import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { PaymentSetupForm } from "./PaymentSetupForm"
import { PriceWithTax } from "@/components/ui/PriceWithTax"

export default async function PaymentSetupPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) redirect("/login")

  if (user.onboardingStep === "COMPLETED") redirect("/dashboard")
  if (user.onboardingStep !== "PAYMENT_SETUP") redirect("/onboarding/plan")

  const clinicId = user.activeClinicId
  if (!clinicId) redirect("/onboarding/plan")

  const subscription = await db.subscription.findUnique({
    where: { clinicId },
    include: { plan: true }
  })

  if (!subscription) redirect("/onboarding/plan")

  const { getRazorpayKeyId } = await import("@/lib/razorpay-utils")
  const razorpayKeyId = await getRazorpayKeyId()

  const globalSetting = await db.globalSetting.findUnique({ where: { key: "DEFAULT_TRIAL_DAYS" } })
  const defaultTrialDays = parseInt(globalSetting?.value || "14", 10)

  const trialEndsAt = subscription.trialEndsAt
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : defaultTrialDays

  const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
  const isIndia = clinic?.countryCode === "IN"
  const isYearly = (subscription.billingCycle || "monthly").toLowerCase() === "yearly"
  const price = isIndia 
    ? (isYearly ? (subscription.plan.priceYearlyInr || subscription.plan.priceMonthlyInr * 12) : subscription.plan.priceMonthlyInr)
    : (isYearly ? (subscription.plan.priceYearlyUsd || subscription.plan.priceMonthlyUsd * 12) : subscription.plan.priceMonthlyUsd)
  const currency: "INR" | "USD" = isIndia ? "INR" : "USD"

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-forest-soft text-forest text-[13px] font-semibold mb-4">
            <span className="w-2 h-2 rounded-full bg-forest inline-block"></span>
            {trialDaysLeft}-day free trial started
          </div>
          <h1 className="text-[28px] font-bold text-ink mb-2">Add your payment method</h1>
          <p className="text-[14px] text-ink-soft">
            You&apos;ll only be charged after your <strong>{trialDaysLeft}-day trial</strong> ends on{" "}
            <strong>
              {trialEndsAt?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </strong>
            . Cancel any time before then.
          </p>
        </div>

        {/* Plan Summary */}
        <div className="bg-white border border-line rounded-xl p-5 mb-6 flex items-center justify-between">
          <div>
            <div className="text-[13px] text-ink-soft font-medium">Selected plan</div>
            <div className="text-[17px] font-bold text-ink mt-0.5">{subscription.plan.name} {isYearly ? "(Yearly)" : "(Monthly)"}</div>
          </div>
          <div className="text-right">
            <div className="text-[20px] font-bold text-ink">
              <PriceWithTax amount={price} currency={currency} countryCode={clinic?.countryCode} /><span className="text-[14px] font-normal text-ink-soft">{isYearly ? "/yr" : "/mo"}</span>
            </div>
            <div className="text-[12px] text-ink-soft mt-0.5">after trial</div>
          </div>
        </div>

        <PaymentSetupForm 
          clinicId={clinicId} 
          userId={user.id} 
          razorpayKeyId={razorpayKeyId}
          planId={subscription.plan.id}
          razorpayPlanId={isYearly ? subscription.plan.razorpayPlanIdYearly : subscription.plan.razorpayPlanIdMonthly}
          planName={subscription.plan.name}
          trialEndsAt={trialEndsAt?.toISOString() || ""}
          currency={currency}
          billingCycle={isYearly ? "YEARLY" : "MONTHLY"}
        />

        <p className="text-center text-[12px] text-ink-soft mt-6">
          🔒 Secured by Razorpay. We never store your card details on our servers.
        </p>
      </div>
    </div>
  )
}
