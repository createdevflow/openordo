"use client"

import React, { useEffect, useState } from "react"
import { getTaxCountryConfig } from "@/server/actions/tax"

export interface PriceWithTaxProps {
  amount: number
  countryCode?: string | null
  className?: string
  currency?: "USD" | "INR"
  taxConfig?: any // Optional pre-fetched config
  showTaxSuffix?: boolean
}

export function PriceWithTax({
  amount,
  countryCode,
  className,
  currency = "USD",
  taxConfig,
  showTaxSuffix = true,
}: PriceWithTaxProps) {
  const [config, setConfig] = useState<any>(taxConfig)
  const currencySymbol = currency === "INR" ? "₹" : "$"

  const formattedAmount = amount === 0
    ? "Free"
    : `${currencySymbol}${amount % 1 === 0
        ? amount.toLocaleString(currency === "INR" ? "en-IN" : "en-US")
        : amount.toLocaleString(currency === "INR" ? "en-IN" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }`

  useEffect(() => {
    if (!taxConfig && countryCode) {
      getTaxCountryConfig(countryCode).then(setConfig).catch(console.error)
    }
  }, [countryCode, taxConfig])

  if (!showTaxSuffix || amount === 0) {
    return <span className={className}>{formattedAmount}</span>
  }

  if (!countryCode) {
    return (
      <span className={className}>
        {formattedAmount} <span className="text-sm font-normal text-ink-soft">+ applicable tax</span>
      </span>
    )
  }

  if (!config || config.calculationMode === "NONE") {
    return <span className={className}>{formattedAmount}</span>
  }

  return (
    <span className={className}>
      {formattedAmount} <span className="text-sm font-normal text-ink-soft">+{config.flatRate}% {config.taxLabel}</span>
    </span>
  )
}
