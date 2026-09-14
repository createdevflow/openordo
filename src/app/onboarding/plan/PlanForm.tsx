"use client"

import { useActionState, useState, useEffect } from "react"
import { selectPlanAction } from "@/server/actions/onboarding"
import { Button } from "@/components/ui/Button"
import { OnboardingPromoCard } from "./OnboardingPromoCard"
import { Check, Sparkles } from "lucide-react"

export function PlanForm({
  plans,
  promo,
  currency = "USD",
  initialPlan
}: {
  plans: any[]
  promo?: any | null
  currency?: "USD" | "INR"
  initialPlan?: string
}) {
  const [state, formAction, pending] = useActionState(selectPlanAction, null)
  const [showAll, setShowAll] = useState(!promo)
  const [selectedCurrency, setSelectedCurrency] = useState<"USD" | "INR">(currency)

  // Default selected plan: matched initialPlan, featured plan, or the first plan
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
    if (initialPlan) {
      const match = plans.find(p => 
        p.slug === initialPlan.toLowerCase() || 
        p.id === initialPlan || 
        p.name.toLowerCase() === initialPlan.toLowerCase()
      )
      if (match) return match.id
    }
    const featured = plans.find(p => p.isFeatured)
    return featured?.id || plans[0]?.id || ""
  })

  // Auto-detect India timezone on client if not already detected from server
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""
      const isIndia = tz.includes("Kolkata") || tz.includes("Calcutta") || navigator.language === "en-IN"
      if (isIndia && selectedCurrency !== "INR") {
        setSelectedCurrency("INR")
      }
    } catch (e) {}
  }, [])

  const targetPlan = promo ? plans.find(p => p.id === promo.targetPlanId) : null
  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[0]
  const selectedPrice = selectedCurrency === "INR" ? selectedPlan?.priceMonthlyInr : selectedPlan?.priceMonthlyUsd
  const selectedSymbol = selectedCurrency === "INR" ? "₹" : "$"

  return (
    <div>
      {promo && targetPlan && !showAll && (
        <>
          <OnboardingPromoCard promo={promo} targetPlan={targetPlan} />
          <div className="text-center mb-6">
            <button 
              type="button" 
              onClick={() => setShowAll(true)}
              className="text-ink-soft hover:text-ink text-[14px] underline underline-offset-4 cursor-pointer font-medium"
            >
              Or compare all subscription plans
            </button>
          </div>
        </>
      )}

      {showAll && (
        <form action={formAction}>
          {state?.error && (
            <div className="bg-coral-soft text-coral p-3 rounded-md text-[13px] font-medium mb-6">
              {state.error}
            </div>
          )}

          {/* Currency Toggle & Location Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-5 border-b border-line">
            <div>
              <div className="text-[14px] font-semibold text-ink flex items-center gap-1.5">
                <span>{selectedCurrency === "INR" ? "🇮🇳 Indian Rupee Pricing" : "🌐 International Pricing"}</span>
              </div>
              <p className="text-[12.5px] text-ink-soft m-0">
                {selectedCurrency === "INR"
                  ? "Showing regional pricing in INR (₹) for Indian clinics."
                  : "Showing standard global pricing in USD ($)."}
              </p>
            </div>

            <div className="inline-flex rounded-full p-1 bg-paper border border-line shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSelectedCurrency("INR")}
                className={`px-3.5 py-1.5 text-[12.5px] font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedCurrency === "INR"
                    ? "bg-forest text-white shadow-xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                <span>🇮🇳</span> INR (₹)
              </button>
              <button
                type="button"
                onClick={() => setSelectedCurrency("USD")}
                className={`px-3.5 py-1.5 text-[12.5px] font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedCurrency === "USD"
                    ? "bg-forest text-white shadow-xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                <span>🇺🇸</span> USD ($)
              </button>
            </div>
          </div>

          {/* Hidden input for selected plan submission */}
          <input type="hidden" name="planId" value={selectedPlanId} />

          {/* Vertical Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-8">
            {plans.map((plan) => {
              const isSelected = selectedPlanId === plan.id
              const priceMonthly = selectedCurrency === "INR" ? plan.priceMonthlyInr : plan.priceMonthlyUsd
              const currencySymbol = selectedCurrency === "INR" ? "₹" : "$"
              const isPromoTarget = promo && promo.targetPlanId === plan.id

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`relative flex flex-col justify-between rounded-card p-6 md:p-7 transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? "border-2 border-forest bg-paper-raised shadow-[0_16px_36px_rgba(30,70,56,0.12)] ring-2 ring-forest/20"
                      : "border border-line bg-paper hover:bg-paper-raised hover:border-forest/40 hover:shadow-sm"
                  }`}
                >
                  {/* Top Badges */}
                  {plan.isFeatured && !isPromoTarget && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-forest text-white text-[10.5px] font-bold uppercase tracking-wider px-3.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                      <Sparkles size={11} /> Most Popular
                    </div>
                  )}

                  {isPromoTarget && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber text-white text-[10.5px] font-bold uppercase tracking-wider px-3.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                      🎉 {promo.durationDays} Days Free Trial
                    </div>
                  )}

                  <div>
                    {/* Header: Name + Radio */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-[19px] font-bold text-ink m-0">{plan.name}</h3>
                        <p className="text-[13px] text-ink-soft mt-1 mb-0 min-h-[36px]">
                          {plan.description || (
                            plan.name.toLowerCase().includes("starter")
                              ? "Ideal for solo practitioners and new practices"
                              : plan.name.toLowerCase().includes("practice")
                              ? "Best for growing clinics and collaborative teams"
                              : "Advanced multi-practitioner & group workflows"
                          )}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected ? "border-forest bg-forest text-white" : "border-line bg-paper-raised"
                      }`}>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>

                    {/* Price Tag */}
                    <div className="my-5 pb-5 border-b border-line">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[36px] font-serif font-bold text-ink leading-none">
                          {priceMonthly === 0 ? "Free" : `${currencySymbol}${priceMonthly.toLocaleString()}`}
                        </span>
                        {priceMonthly > 0 ? (
                          <span className="text-[14px] font-medium text-ink-soft">/month</span>
                        ) : (
                          <span className="text-[13.5px] font-medium text-ink-soft">forever</span>
                        )}
                      </div>

                      {/* Doctor / Patient Capacity Chips */}
                      <div className="text-[12px] text-ink-soft mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-block px-2 py-0.5 rounded bg-paper-raised border border-line text-ink font-medium">
                          {plan.doctorLimit ? `Up to ${plan.doctorLimit} Doctors` : "Unlimited Doctors"}
                        </span>
                        <span className="inline-block px-2 py-0.5 rounded bg-paper-raised border border-line text-ink font-medium">
                          {plan.patientLimit ? `${plan.patientLimit} Patients` : "Unlimited Patients"}
                        </span>
                      </div>
                    </div>

                    {/* Features List */}
                    <div>
                      <div className="text-[11px] font-bold text-ink-soft uppercase tracking-wider mb-3">
                        Included Features:
                      </div>
                      <ul className="space-y-2.5 p-0 m-0 list-none">
                        {(plan.featureList || []).map((feature: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2.5 text-[13.5px] text-ink leading-[1.35]">
                            <div className="w-4 h-4 rounded-full bg-forest-soft text-forest flex items-center justify-center shrink-0 mt-0.5">
                              <Check size={11} strokeWidth={3} />
                            </div>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Card Select Button */}
                  <div className="mt-6 pt-5 border-t border-line">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPlanId(plan.id)
                      }}
                      className={`w-full py-2.5 px-4 rounded-control text-[13.5px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "bg-forest text-white shadow-xs"
                          : "border border-line bg-paper text-ink hover:border-forest hover:bg-paper-raised"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check size={15} strokeWidth={2.5} /> Selected Plan
                        </>
                      ) : (
                        `Select ${plan.name}`
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sticky/Bottom Summary & Submit Action */}
          <div className="bg-paper border border-line rounded-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="text-[15px] font-bold text-ink">
                Selected: {selectedPlan?.name}
              </div>
              <div className="text-[13px] text-ink-soft mt-0.5">
                {selectedPrice === 0
                  ? "Free forever · No credit card required"
                  : `${selectedSymbol}${selectedPrice?.toLocaleString()}/month · You can change or cancel anytime`}
              </div>
            </div>

            <Button
              type="submit"
              disabled={pending}
              className="w-full sm:w-auto px-8 py-3 text-[14.5px] font-bold cursor-pointer"
            >
              {pending ? "Finishing setup..." : `Continue with ${selectedPlan?.name} →`}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
