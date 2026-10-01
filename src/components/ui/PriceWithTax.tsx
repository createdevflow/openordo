"use client"

import React, { useEffect, useState } from "react"
import { getTaxCountryConfig } from "@/server/actions/tax"

export interface PriceWithTaxProps {
  amount: number
  countryCode?: string | null
  className?: string
  currency?: "USD" | "INR"
  taxConfig?: any // Optional pre-fetched config
}

export function PriceWithTax({ amount, countryCode, className, currency = "USD", taxConfig }: PriceWithTaxProps) {
  const [config, setConfig] = useState<any>(taxConfig)
  const currencySymbol = currency === "INR" ? "₹" : "$"
  const formatted = amount === 0 ? "Free" : `${currencySymbol}${amount.toLocaleString()}`

  useEffect(() => {
    if (!taxConfig && countryCode) {
      getTaxCountryConfig(countryCode).then(setConfig).catch(console.error)
    }
  }, [countryCode, taxConfig])

  if (!countryCode) {
    if (amount === 0) return <span className={className}>{formatted}</span>
    return (
      <span className={className}>
        {formatted} <span className="text-sm font-normal text-ink-soft">+ applicable tax</span>
      </span>
    )
  }

  if (!config || config.calculationMode === "NONE" || amount === 0) {
    return <span className={className}>{formatted}</span>
  }

  return (
    <span className={className}>
      {formatted} <span className="text-sm font-normal text-ink-soft">+{config.flatRate}% {config.taxLabel}</span>
    </span>
  )
}

