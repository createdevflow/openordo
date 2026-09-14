"use client"

import { useActionState, useState } from "react"
import { redeemPromoAction } from "@/server/actions/onboarding"
import { Button } from "@/components/ui/Button"
import { CheckCircle2 } from "lucide-react"

export function OnboardingPromoCard({ promo, targetPlan }: { promo: any, targetPlan: any }) {
  const [state, formAction, pending] = useActionState(redeemPromoAction, null)

  const featureList = targetPlan.featureList || (typeof targetPlan.features === 'string' ? JSON.parse(targetPlan.features || "[]") : targetPlan.features) || []

  return (
    <form action={formAction} className="bg-forest-dark text-white rounded-[12px] p-8 relative overflow-hidden shadow-xl mb-8">
      <div className="relative z-10">
        <input type="hidden" name="promoId" value={promo.id} />
        
        <div className="bg-amber-400 text-forest-dark font-bold text-[12px] uppercase tracking-wider px-3 py-1 rounded-full inline-block mb-4">
          Limited Time Offer
        </div>
        
        <h2 className="text-[28px] font-bold mb-2 text-amber-400">{promo.headline}</h2>
        {promo.subtext && <p className="text-[16px] text-white/80 mb-8">{promo.subtext}</p>}

        <div className="bg-white/10 rounded-xl p-6 mb-8 border border-white/20">
          <div className="text-[13px] font-bold uppercase tracking-wider mb-4 opacity-80">Includes everything in {targetPlan.name}:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featureList.map((feature: string, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <span className="text-[14.5px] leading-[1.4]">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {state?.error && (
          <div className="bg-coral-soft text-coral p-3 rounded-md text-[13px] font-medium mb-6">
            {state.error}
          </div>
        )}

        <Button type="submit" disabled={pending} className="w-full md:w-auto bg-amber-400 hover:bg-amber-500 text-forest-dark font-bold px-8 py-3 text-[16px] h-auto border-0">
          {pending ? "Claiming..." : "Start free — no card required"}
        </Button>
      </div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500 blur-[100px] rounded-full opacity-20 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
    </form>
  )
}
