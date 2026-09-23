"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Check, Sparkles, ArrowRight } from "lucide-react"

export type PlanItem = {
  id: string
  name: string
  slug: string
  description?: string
  priceMonthlyUsd: number
  priceMonthlyInr: number
  patientLimit?: number | null
  doctorLimit?: number | null
  storageLimitGb?: number | null
  isFeatured?: boolean
  featuresList: string[]
}

export function LandingPricingSection({
  plans,
  promo,
  initialCurrency = "USD",
  defaultTrialDays = 14
}: {
  plans: PlanItem[]
  promo?: any | null
  initialCurrency?: "USD" | "INR"
  defaultTrialDays?: number
}) {
  const [currency, setCurrency] = useState<"USD" | "INR">(initialCurrency)

  // Auto-detect India timezone on client if not already detected from headers
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""
      const isIndia = tz.includes("Kolkata") || tz.includes("Calcutta") || navigator.language === "en-IN"
      if (isIndia && currency !== "INR") {
        setCurrency("INR")
      }
    } catch (e) {}
  }, [])

  return (
    <section id="pricing" className="mx-auto max-w-[1180px] px-7 pb-[84px]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="max-w-[640px]">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest/10 text-forest text-[12px] font-bold uppercase tracking-wider mb-3">
            Transparent Clinic Pricing
          </div>
          <h2 className="mb-3 font-serif text-[34px] font-semibold tracking-[-0.01em] text-ink">
            Priced by clinic, not by patient count
          </h2>
          <p className="text-[16px] leading-[1.55] text-ink-soft m-0">
            Every plan includes patient records, calendar scheduling, billing, and clinical charts. Upgrade as your team grows.
          </p>
        </div>

        {/* Currency Switcher */}
        <div className="inline-flex items-center rounded-full p-1 bg-paper border border-line shrink-0">
          <button
            type="button"
            onClick={() => setCurrency("INR")}
            className={`px-4 py-1.5 text-[12.5px] font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
              currency === "INR"
                ? "bg-forest text-white shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <span>🇮🇳</span> INR (₹)
          </button>
          <button
            type="button"
            onClick={() => setCurrency("USD")}
            className={`px-4 py-1.5 text-[12.5px] font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
              currency === "USD"
                ? "bg-forest text-white shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <span>🌐</span> USD ($)
          </button>
        </div>
      </div>

      {/* Promotional Banner if active */}
      {promo && (
        <div className="rounded-[12px] bg-forest-dark p-6 text-white mb-8 border border-forest relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative z-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber bg-amber/20 px-2.5 py-0.5 rounded-full mb-1.5 inline-block">
              Limited Time Offer
            </span>
            <h3 className="text-[20px] font-bold text-white mb-1">{promo.headline}</h3>
            {promo.subtext && <p className="text-[14px] text-white/80 m-0">{promo.subtext}</p>}
          </div>
          <Link
            href="/register"
            className="relative z-10 inline-flex items-center justify-center gap-1.5 rounded-control bg-amber px-5 py-2.5 text-[13.5px] font-bold text-forest-dark hover:brightness-105 transition-all shrink-0"
          >
            Claim Offer <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
        {plans.map((plan) => {
          const isFeatured = plan.isFeatured
          const isFree = plan.priceMonthlyUsd === 0 && plan.priceMonthlyInr === 0
          const price = currency === "INR" ? plan.priceMonthlyInr : plan.priceMonthlyUsd
          const symbol = currency === "INR" ? "₹" : "$"

          const subtext = isFree
            ? `${plan.patientLimit ? `up to ${plan.patientLimit} patients, ` : ""}forever free`
            : "per clinic / month"

          const doctorText = plan.doctorLimit 
            ? `Up to ${plan.doctorLimit} doctor ${plan.doctorLimit === 1 ? "login" : "logins"}` 
            : "Unlimited doctor logins"

          const patientText = plan.patientLimit
            ? `Up to ${plan.patientLimit} active patient charts`
            : "Unlimited patient charts & records"

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-[14px] border bg-paper-raised p-7 transition-shadow ${
                isFeatured
                  ? "border-forest shadow-[0_12px_32px_rgba(30,70,56,0.12)] ring-1 ring-forest"
                  : "border-line hover:shadow-sm"
              }`}
            >
              {isFeatured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-forest px-3.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs">
                  Most Popular
                </div>
              )}

              <div className="mb-1 text-[13.5px] font-bold text-moss uppercase tracking-wider">
                {plan.name}
              </div>

              <div className="mb-1 flex items-baseline gap-1">
                <span className="font-serif text-[38px] font-semibold text-ink">
                  {isFree ? "Free" : `${symbol}${price.toLocaleString()}`}
                </span>
                {!isFree && (
                  <span className="text-[13.5px] text-ink-soft">/ month</span>
                )}
              </div>

              <div className="mb-5 text-[12.5px] text-ink-soft font-medium">
                {subtext}
              </div>

              {/* Scope summary */}
              <div className="mb-6 rounded-lg bg-paper p-3 border border-line text-[12.5px] space-y-1">
                <div className="font-semibold text-ink flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest shrink-0"></span>
                  {doctorText}
                </div>
                <div className="font-semibold text-ink flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest shrink-0"></span>
                  {patientText}
                </div>
              </div>

              {/* Feature Bullet List */}
              <ul className="mb-8 flex flex-1 flex-col gap-2.5 p-0 m-0 list-none">
                {plan.featuresList.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[13.5px] text-ink leading-[1.45]">
                    <Check size={16} className="mt-0.5 shrink-0 text-forest" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              <Link 
                href={`/register?plan=${plan.slug || plan.id}`}
                className="block w-full mt-auto"
              >
                <button
                  type="button"
                  className={`w-full py-2.5 px-4 rounded-control text-[14px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isFeatured
                      ? "bg-forest text-white hover:brightness-110 shadow-xs"
                      : isFree
                        ? "bg-paper border border-line text-ink hover:bg-paper-raised"
                        : "bg-paper-raised border border-forest text-forest hover:bg-forest hover:text-white"
                  }`}
                  style={isFeatured ? { color: "#FFFFFF" } : {}}
                >
                  {isFree ? "Start free" : `Start ${defaultTrialDays}-day free trial`} <ArrowRight size={14} />
                </button>
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}
