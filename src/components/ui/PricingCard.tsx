import React from "react"
import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Button } from "./Button"

export type PricingCardProps = {
  plan: any
  promo?: any | null
  hideCta?: boolean
  currency?: "USD" | "INR"
}

export function PricingCard({ plan, promo, hideCta = false, currency = "USD" }: PricingCardProps) {
  const isPromoTarget = promo && promo.targetPlanId === plan.id
  let featureList: string[] = []
  try {
    featureList = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features || []
  } catch {
    featureList = []
  }

  if (!featureList || featureList.length === 0) {
    const slug = (plan.slug || plan.name || "").toLowerCase()
    if (slug.includes("starter")) {
      featureList = [
        "1 Doctor account",
        `Up to ${plan.patientLimit || 200} patient records`,
        "Visual appointment calendar",
        "Patient medical history & charts",
        "Doctor profile & working hours",
        "Automated daily data backups"
      ]
    } else if (slug.includes("practice")) {
      featureList = [
        `Up to ${plan.doctorLimit || 6} Doctor accounts`,
        "Unlimited patient records & charts",
        "Visual appointment calendar",
        "Public online booking page link",
        "Invoicing & itemized billing",
        "Automated SMS & email reminders",
        "Automated waitlist management"
      ]
    } else {
      featureList = [
        "Unlimited Doctor accounts",
        "Unlimited patient records & charts",
        "All Practice plan features included",
        "Multi-doctor simultaneous scheduling",
        "Insurance tracking & claims",
        "Monthly & annual revenue analytics",
        "Clinic data export (CSV/PDF)",
        "Dedicated priority onboarding"
      ]
    }
  }

  const priceMonthly = currency === "INR" ? plan.priceMonthlyInr : plan.priceMonthlyUsd
  const currencySymbol = currency === "INR" ? "₹" : "$"

  return (
    <div 
      className={`rounded-[12px] p-8 border ${
        plan.isFeatured 
          ? 'border-forest bg-paper-raised shadow-[0_20px_40px_rgba(0,0,0,0.08)] relative z-10' 
          : 'border-line bg-paper'
      }`}
    >
      {plan.isFeatured && !isPromoTarget && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-forest text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
          Most Popular
        </div>
      )}

      {isPromoTarget && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-white text-[12px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 whitespace-nowrap">
          🎉 Free for {promo.durationDays} days
        </div>
      )}
      
      <h3 className="text-[21px] font-bold mb-2">{plan.name}</h3>
      <div className="mb-6 flex flex-col">
        {isPromoTarget ? (
          <>
            <span className="text-[34px] font-serif font-medium text-forest">
              Free
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-ink-soft text-[14px] line-through">
                {priceMonthly === 0 ? 'Free' : `${currencySymbol}${priceMonthly.toLocaleString()}`}
              </span>
              {priceMonthly > 0 && <span className="text-ink-soft text-[13px]">/mo after trial</span>}
            </div>
          </>
        ) : (
          <div>
            <span className="text-[34px] font-serif font-medium">
              {priceMonthly === 0 ? 'Free' : `${currencySymbol}${priceMonthly.toLocaleString()}`}
            </span>
            {priceMonthly > 0 && <span className="text-ink-soft text-[14px]">/mo</span>}
          </div>
        )}
      </div>

      {!hideCta && (
        <Link href={`/register?plan=${plan.slug || plan.id}`} className="block mb-8">
          <Button 
            variant={plan.isFeatured || isPromoTarget ? 'primary' : 'ghost'} 
            className={`w-full ${plan.isFeatured || isPromoTarget ? '' : 'border border-line bg-paper-raised hover:bg-paper'}`}
          >
            {isPromoTarget ? 'Claim offer' : priceMonthly === 0 ? 'Get started' : 'Start free trial'}
          </Button>
        </Link>
      )}

      <div className="space-y-4">
        <div className="text-[13px] font-bold text-ink uppercase tracking-wider mb-4">Includes:</div>
        {featureList.map((feature: string, i: number) => (
          <div key={i} className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-forest shrink-0 mt-0.5" />
            <span className="text-[14.5px] text-ink-soft leading-[1.4]">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
