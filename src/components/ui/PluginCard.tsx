"use client"

import { useState } from "react"
import {
  Video,
  Package,
  FileSignature,
  UserPlus,
  Palette,
  FolderLock,
  CalendarPlus,
  Puzzle,
  Zap,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import { PriceWithTax } from "./PriceWithTax"

export function ExpandableDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const content = text.replace(/\s*[—–-]\s*/g, " ")

  return (
    <div style={{ marginBottom: 20 }}>
      <p
        style={{
          fontSize: 13,
          color: "var(--ink-soft)",
          lineHeight: 1.55,
          margin: 0,
          display: expanded ? "block" : "-webkit-box",
          WebkitLineClamp: expanded ? "unset" : 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {content}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "none",
          border: "none",
          color: "var(--forest)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          padding: 0,
          marginTop: 4,
          textAlign: "left",
        }}
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </div>
  )
}

// Map of slug → lucide icon name → component
const ICON_MAP: Record<string, React.ElementType> = {
  Video,
  Package,
  FileSignature,
  UserPlus,
  Palette,
  FolderLock,
  CalendarPlus,
  Puzzle,
  Zap,
}

function PluginIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] || Puzzle
  return <Icon size={size} />
}

export interface PluginCardData {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  category: string
  icon: string
  priceOneTimeINR: number | null
  priceOneTimeUSD: number | null
  priceMonthlyINR: number | null
  priceMonthlyUSD: number | null
  priceYearlyINR: number | null
  priceYearlyUSD: number | null
  razorpayPlanIdMonthly?: string | null
  razorpayPlanIdYearly?: string | null
  isComingSoon?: boolean
  sortOrder?: number | null
}

function getAmt(amount: number) {
  return amount / 100
}

function buildPricingLines(
  plugin: PluginCardData,
  currency: "INR" | "USD",
  countryCode?: string | null
): { label: React.ReactNode; model: string }[] {
  const lines: { label: React.ReactNode; model: string }[] = []
  if (plugin.priceOneTimeINR && plugin.priceOneTimeUSD) {
    const amt = getAmt(currency === "INR" ? plugin.priceOneTimeINR : plugin.priceOneTimeUSD)
    lines.push({
      label: (
        <>
          <PriceWithTax amount={amt} currency={currency} countryCode={countryCode} /> one-time
        </>
      ),
      model: "ONE_TIME",
    })
  }
  if (plugin.priceMonthlyINR && plugin.priceMonthlyUSD) {
    const amt = getAmt(currency === "INR" ? plugin.priceMonthlyINR : plugin.priceMonthlyUSD)
    lines.push({
      label: (
        <>
          <PriceWithTax amount={amt} currency={currency} countryCode={countryCode} />/mo
        </>
      ),
      model: "MONTHLY",
    })
  }
  if (plugin.priceYearlyINR && plugin.priceYearlyUSD) {
    const amt = getAmt(currency === "INR" ? plugin.priceYearlyINR : plugin.priceYearlyUSD)
    lines.push({
      label: (
        <>
          <PriceWithTax amount={amt} currency={currency} countryCode={countryCode} />/yr
        </>
      ),
      model: "YEARLY",
    })
  }
  return lines
}

export interface PluginCardProps {
  plugin: PluginCardData
  currency?: "INR" | "USD"
  /** "marketing" = public marketing card, "dashboard" | "addons" | "admin" = dashboard / admin preview */
  variant?: "marketing" | "dashboard" | "landing" | "addons" | "admin"
  onPurchase?: (plugin: PluginCardData) => void
  isLoggedIn?: boolean
  countryCode?: string | null
  taxConfig?: {
    calculationMode?: string
    flatRate?: number | null
    taxLabel?: string | null
  } | null
}

export function PluginCard({
  plugin,
  currency = "INR",
  variant = "dashboard",
  onPurchase,
  countryCode,
  taxConfig,
}: PluginCardProps) {
  const categoryColor = plugin.category === "Clinical" ? "#14b8a6" : "#8b5cf6"

  // ─── DASHBOARD / ADMIN VARIANT ──────────────────────────────────────────────
  if (variant === "dashboard" || variant === "addons" || variant === "admin") {
    const pricingLines = buildPricingLines(plugin, currency, countryCode)
    const primaryPrice = pricingLines[0]?.label ?? "Free"

    return (
      <div className="plugin-card" style={{ padding: 20, gap: 0, justifyContent: "space-between", height: "100%" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: `${categoryColor}15`,
                color: categoryColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <PluginIcon name={plugin.icon} size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", margin: "0 0 4px" }}>
                {plugin.name}
              </h3>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: categoryColor,
                    border: `1px solid ${categoryColor}40`,
                    padding: "1px 8px",
                    borderRadius: 12,
                  }}
                >
                  {plugin.category}
                </span>
                {plugin.isComingSoon && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#d97706",
                      background: "#fef3c7",
                      padding: "1px 8px",
                      borderRadius: 12,
                      textTransform: "uppercase",
                    }}
                  >
                    Coming Soon
                  </span>
                )}
              </div>
            </div>
          </div>

          <ExpandableDescription text={plugin.description || plugin.tagline} />
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            paddingTop: 16,
            marginTop: "auto",
            borderTop: "1px solid var(--line)",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
            {plugin.isComingSoon ? "TBD" : primaryPrice}
          </div>

          {onPurchase && (
            <button
              style={{
                padding: "7px 18px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                background: "transparent",
                color: "var(--forest)",
                border: "1.5px solid var(--forest)",
                cursor: plugin.isComingSoon ? "not-allowed" : "pointer",
                opacity: plugin.isComingSoon ? 0.5 : 1,
                transition: "all .15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!plugin.isComingSoon) {
                  e.currentTarget.style.background = "var(--forest)"
                  e.currentTarget.style.color = "#fff"
                }
              }}
              onMouseLeave={(e) => {
                if (!plugin.isComingSoon) {
                  e.currentTarget.style.background = "transparent"
                  e.currentTarget.style.color = "var(--forest)"
                }
              }}
              onClick={() => (plugin.isComingSoon ? null : onPurchase(plugin))}
              disabled={plugin.isComingSoon}
            >
              {plugin.isComingSoon ? "Coming Soon" : "Configure"}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─── MARKETING VARIANT ──────────────────────────────────────────────────────
  // Extract prices according to resolved currency
  const monthlyRaw = currency === "INR" ? plugin.priceMonthlyINR : plugin.priceMonthlyUSD
  const yearlyRaw = currency === "INR" ? plugin.priceYearlyINR : plugin.priceYearlyUSD
  const oneTimeRaw = currency === "INR" ? plugin.priceOneTimeINR : plugin.priceOneTimeUSD

  interface MarketingPricingRow {
    key: "monthly" | "yearly" | "onetime"
    label: string
    amount: number
    suffix: string
    savingsPct?: number
  }

  const pricingRows: MarketingPricingRow[] = []

  // Fixed order: Monthly, Yearly, One-time
  if (monthlyRaw != null && monthlyRaw > 0) {
    pricingRows.push({
      key: "monthly",
      label: "Monthly",
      amount: monthlyRaw / 100,
      suffix: "/mo",
    })
  }

  if (yearlyRaw != null && yearlyRaw > 0) {
    let savingsPct: number | undefined
    if (monthlyRaw != null && monthlyRaw > 0) {
      const monthlyVal = monthlyRaw / 100
      const yearlyVal = yearlyRaw / 100
      const calculated = Math.round((1 - yearlyVal / (monthlyVal * 12)) * 100)
      if (calculated >= 5) {
        savingsPct = calculated
      }
    }
    pricingRows.push({
      key: "yearly",
      label: "Yearly",
      amount: yearlyRaw / 100,
      suffix: "/yr",
      savingsPct,
    })
  }

  if (oneTimeRaw != null && oneTimeRaw > 0) {
    pricingRows.push({
      key: "onetime",
      label: "One-time",
      amount: oneTimeRaw / 100,
      suffix: "",
    })
  }

  // Determine tax note for marketing visitor
  let taxNote = "Prices exclude applicable tax"
  if (currency === "INR" || countryCode === "IN") {
    if (taxConfig && taxConfig.calculationMode !== "NONE" && taxConfig.flatRate && taxConfig.taxLabel) {
      taxNote = `Prices exclude ${taxConfig.flatRate}% ${taxConfig.taxLabel}`
    } else {
      taxNote = "Prices exclude 18% GST"
    }
  } else if (taxConfig && taxConfig.calculationMode !== "NONE" && taxConfig.flatRate && taxConfig.taxLabel) {
    taxNote = `Prices exclude ${taxConfig.flatRate}% ${taxConfig.taxLabel}`
  }

  const currencySymbol = currency === "INR" ? "₹" : "$"

  return (
    <div className="flex flex-col h-full bg-paper-raised border border-line rounded-[12px] p-5 sm:p-6 transition-colors hover:border-[#b8c9c0]">
      {/* 1. Header row */}
      <div className="flex items-center justify-between gap-3">
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: `${categoryColor}18`, color: categoryColor }}
        >
          <PluginIcon name={plugin.icon} size={20} />
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.08em] font-sans"
            style={{ color: categoryColor, fontVariantCaps: "all-small-caps" }}
          >
            {plugin.category}
          </span>
          {plugin.isComingSoon && (
            <span className="text-[10px] font-bold text-amber bg-amber-soft px-2 py-0.5 rounded-full uppercase tracking-wider">
              Coming Soon
            </span>
          )}
        </div>
      </div>

      {/* 2. Name */}
      <h3 className="text-[17px] font-semibold text-ink truncate mt-3.5 mb-1" title={plugin.name}>
        {plugin.name}
      </h3>

      {/* 3. Description (clamped to 2 lines, 42px reserved height) */}
      <p className="text-[14px] leading-[21px] text-ink-soft line-clamp-2 h-[42px] overflow-hidden m-0">
        {plugin.description || plugin.tagline}
      </p>

      {/* 4. Divider */}
      <div className="my-4 border-t border-line" />

      {/* 5. Pricing list pushed to bottom */}
      <div className="mt-auto flex flex-col justify-end">
        {plugin.isComingSoon || pricingRows.length === 0 ? (
          <div className="text-[13px] text-moss py-1">Pricing details coming soon</div>
        ) : (
          <div className="space-y-2">
            {pricingRows.map((row) => {
              const formattedDigits =
                row.amount % 1 === 0
                  ? row.amount.toLocaleString(currency === "INR" ? "en-IN" : "en-US")
                  : row.amount.toLocaleString(currency === "INR" ? "en-IN" : "en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })

              return (
                <div key={row.key} className="flex items-center justify-between gap-3 py-0.5">
                  <div className="flex items-center gap-1.5 text-[13px] text-moss min-w-0">
                    <span className="truncate">{row.label}</span>
                    {row.savingsPct != null && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#F3E3C6] text-[#C8862B] border border-[#C8862B]/20 shrink-0">
                        Save {row.savingsPct}%
                      </span>
                    )}
                  </div>
                  <span className="text-[15px] font-semibold text-ink whitespace-nowrap shrink-0">
                    <span className="font-sans">{currencySymbol}</span>
                    <span className="font-mono">{formattedDigits}</span>
                    {row.suffix && (
                      <span className="font-sans text-[13px] font-normal text-moss">{row.suffix}</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* 6. Tax note */}
        {!plugin.isComingSoon && pricingRows.length > 0 && (
          <div className="mt-3 text-[12px] font-normal text-moss font-sans whitespace-nowrap overflow-hidden text-ellipsis">
            {taxNote}
          </div>
        )}
      </div>
    </div>
  )
}

/** Upsell card shown inside the dashboard when a plugin feature is accessed but not purchased */
export function PluginUpsellCard({ slug, name, tagline }: { slug: string; name: string; tagline: string }) {
  return (
    <div className="plugin-upsell-card">
      <div className="plugin-upsell-icon">
        <Puzzle size={28} />
      </div>
      <div className="plugin-upsell-body">
        <h3 className="plugin-upsell-title">{name}</h3>
        <p className="plugin-upsell-tagline">{tagline}</p>
      </div>
      <Link href={`/dashboard/addons#${slug}`} className="plugin-upsell-btn">
        View this add-on <ArrowRight size={14} />
      </Link>
    </div>
  )
}
