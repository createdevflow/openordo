"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { PluginCard, PluginCardData } from "@/components/ui/PluginCard"

interface MarketingAddonsSectionProps {
  plugins: PluginCardData[]
  currency: "INR" | "USD"
  countryCode?: string | null
  taxConfig?: {
    calculationMode?: string
    flatRate?: number | null
    taxLabel?: string | null
  } | null
}

const CATEGORIES = ["All", "Clinical", "Operations"] as const
type CategoryFilter = (typeof CATEGORIES)[number]

export function MarketingAddonsSection({
  plugins,
  currency,
  countryCode,
  taxConfig,
}: MarketingAddonsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All")

  const sortedPlugins = useMemo(() => {
    return [...plugins].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }, [plugins])

  const filteredPlugins = useMemo(() => {
    if (activeCategory === "All") return sortedPlugins
    return sortedPlugins.filter(
      (p) => p.category?.toLowerCase() === activeCategory.toLowerCase()
    )
  }, [sortedPlugins, activeCategory])

  return (
    <div className="w-full">
      {/* Filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-8 -mx-1 px-1">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-[13.5px] font-medium transition-colors ${
                isActive
                  ? "bg-forest text-white shadow-xs"
                  : "bg-paper-raised text-ink-soft hover:text-ink hover:bg-[#E8E6DC] border border-line"
              }`}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredPlugins.map((plugin) => (
          <PluginCard
            key={plugin.id}
            plugin={plugin}
            currency={currency}
            countryCode={countryCode}
            taxConfig={taxConfig}
            variant="marketing"
          />
        ))}
      </div>

      {filteredPlugins.length === 0 && (
        <div className="text-center py-16 bg-paper-raised rounded-[12px] border border-line">
          <p className="text-[14.5px] text-ink-soft">No add-ons found in this category.</p>
        </div>
      )}

      {/* Centered CTA below grid */}
      <div className="mt-12 sm:mt-14 text-center flex flex-col items-center justify-center">
        <p className="text-[14.5px] sm:text-[15.5px] text-ink-soft mb-3.5 max-w-[500px]">
          Add any add-on after you sign up. Turn them on or off anytime.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-control bg-forest text-white font-semibold text-[14.5px] hover:bg-forest-dark transition-colors shadow-xs"
        >
          Start free trial →
        </Link>
      </div>
    </div>
  )
}
