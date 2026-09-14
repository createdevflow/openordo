"use client"

import { useState } from "react"
import {
  Video, Package, FileSignature, Puzzle,
  Zap, CheckCircle, ArrowRight
} from "lucide-react"
import Link from "next/link"

export function ExpandableDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const content = text.replace(/\s*[—–-]\s*/g, " ")
  
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ 
        fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55, margin: 0,
        display: expanded ? "block" : "-webkit-box", 
        WebkitLineClamp: expanded ? "unset" : 2, 
        WebkitBoxOrient: "vertical", overflow: "hidden"
      }}>
        {content}
      </p>
      <button 
        onClick={() => setExpanded(!expanded)}
        style={{ background: "none", border: "none", color: "var(--forest)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginTop: 4, textAlign: "left" }}
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
  Puzzle,
  Zap,
}

function PluginIcon({ name, size = 22 }: { name: string; size?: number }) {
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
  isComingSoon?: boolean
}

function formatAmt(amount: number, currency: "INR" | "USD"): string {
  if (currency === "INR") return `₹${(amount / 100).toLocaleString("en-IN")}`
  return `$${(amount / 100).toFixed(2)}`
}

function buildPricingLines(plugin: PluginCardData, currency: "INR" | "USD"): { label: string; model: string }[] {
  const lines: { label: string; model: string }[] = []
  if (plugin.priceOneTimeINR && plugin.priceOneTimeUSD) {
    lines.push({ label: `${formatAmt(currency === "INR" ? plugin.priceOneTimeINR : plugin.priceOneTimeUSD, currency)} one-time`, model: "ONE_TIME" })
  }
  if (plugin.priceMonthlyINR && plugin.priceMonthlyUSD) {
    lines.push({ label: `${formatAmt(currency === "INR" ? plugin.priceMonthlyINR : plugin.priceMonthlyUSD, currency)}/mo`, model: "MONTHLY" })
  }
  if (plugin.priceYearlyINR && plugin.priceYearlyUSD) {
    lines.push({ label: `${formatAmt(currency === "INR" ? plugin.priceYearlyINR : plugin.priceYearlyUSD, currency)}/yr`, model: "YEARLY" })
  }
  return lines
}

interface PluginCardProps {
  plugin: PluginCardData
  currency?: "INR" | "USD"
  /** "landing" = marketing page, "addons" = dashboard add-ons page, "admin" = admin preview */
  variant?: "landing" | "addons" | "admin"
  onPurchase?: (plugin: PluginCardData) => void
  isLoggedIn?: boolean
}

export function PluginCard({
  plugin,
  currency = "INR",
  variant = "landing",
  onPurchase,
  isLoggedIn = false,
}: PluginCardProps) {
  const pricingLines = buildPricingLines(plugin, currency)
  const primaryPrice = pricingLines[0]?.label ?? "Free"
  const categoryColor = plugin.category === "Clinical" ? "#14b8a6" : "#8b5cf6"

  if (variant === "addons" || variant === "admin") {
    return (
      <div className="plugin-card" style={{ padding: 20, gap: 0, justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: `${categoryColor}15`, color: categoryColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0
            }}>
              <PluginIcon name={plugin.icon} size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", margin: "0 0 4px" }}>
                {plugin.name}
              </h3>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{
                  fontSize: 10.5, fontWeight: 600, color: categoryColor,
                  border: `1px solid ${categoryColor}40`, padding: "1px 8px", borderRadius: 12
                }}>
                  {plugin.category}
                </span>
                {plugin.isComingSoon && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: "#d97706",
                    background: "#fef3c7", padding: "1px 8px", borderRadius: 12,
                    textTransform: "uppercase"
                  }}>
                    Coming Soon
                  </span>
                )}
              </div>
            </div>
          </div>


          <ExpandableDescription text={plugin.description || plugin.tagline} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
            {plugin.isComingSoon ? "TBD" : primaryPrice}
          </div>
          
          {onPurchase && (
            <button
              style={{
                padding: "8px 24px", borderRadius: 8, fontSize: 13.5, fontWeight: 600,
                background: "transparent", color: "var(--forest)", border: "1.5px solid var(--forest)",
                cursor: plugin.isComingSoon ? "not-allowed" : "pointer",
                opacity: plugin.isComingSoon ? 0.5 : 1,
                transition: "all .15s"
              }}
              onMouseEnter={(e) => {
                if (!plugin.isComingSoon) {
                  e.currentTarget.style.background = "var(--forest)";
                  e.currentTarget.style.color = "#fff";
                }
              }}
              onMouseLeave={(e) => {
                if (!plugin.isComingSoon) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--forest)";
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

  return (
    <div className="plugin-card">
      <div className="plugin-card-header">
        <div className="plugin-card-icon" style={{ background: `${categoryColor}20`, color: categoryColor }}>
          <PluginIcon name={plugin.icon} size={22} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="plugin-card-category" style={{ color: categoryColor }}>
            {plugin.category}
          </span>
          {plugin.isComingSoon && (
            <span style={{ fontSize: 10, fontWeight: 800, background: "#fef3c7", color: "#d97706", padding: "2px 6px", borderRadius: 10, textTransform: "uppercase" }}>
              Coming Soon
            </span>
          )}
        </div>
      </div>

      <div className="plugin-card-body">
        <h3 className="plugin-card-name">{plugin.name}</h3>
        <p className="plugin-card-tagline">{plugin.tagline}</p>
        {variant !== "landing" && (
          <p className="plugin-card-desc">{plugin.description}</p>
        )}
      </div>

      <div className="plugin-card-pricing">
        {plugin.isComingSoon ? (
          <div className="plugin-pricing-line" style={{ color: "var(--ink-soft)" }}>
            <span>Pricing details coming soon</span>
          </div>
        ) : (
          pricingLines.map((line) => (
            <div key={line.model} className="plugin-pricing-line">
              <CheckCircle size={12} className="plugin-pricing-check" />
              <span>{line.label}</span>
            </div>
          ))
        )}
      </div>

      <div className="plugin-card-footer">
        <div className="plugin-card-price">{plugin.isComingSoon ? "TBD" : primaryPrice}</div>
        {variant === "landing" && (
          isLoggedIn ? (
            <Link href={plugin.isComingSoon ? "#" : "/dashboard/addons"} className="plugin-card-btn" style={plugin.isComingSoon ? { opacity: 0.5, pointerEvents: "none" } : {}}>
              {plugin.isComingSoon ? "Coming Soon" : "Get started"} {!plugin.isComingSoon && <ArrowRight size={14} />}
            </Link>
          ) : (
            <Link
              href={plugin.isComingSoon ? "#" : `/register?intent=${plugin.slug}`}
              className="plugin-card-btn"
              style={plugin.isComingSoon ? { opacity: 0.5, pointerEvents: "none" } : {}}
            >
              {plugin.isComingSoon ? "Coming Soon" : "Get started"} {!plugin.isComingSoon && <ArrowRight size={14} />}
            </Link>
          )
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
