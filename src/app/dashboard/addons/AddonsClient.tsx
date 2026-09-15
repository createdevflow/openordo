"use client"

import { useState } from "react"
import { Puzzle, Video, Package, FileSignature, CheckCircle, Calendar, RefreshCw } from "lucide-react"
import { PluginCard, PluginCardData, ExpandableDescription } from "@/components/ui/PluginCard"
import { purchasePluginAction, togglePluginEnabled, uninstallPluginAction } from "@/server/actions/plugins"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const ICON_MAP: Record<string, React.ElementType> = { Video, Package, FileSignature, Puzzle }

function PluginIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] || Puzzle
  return <Icon size={size} />
}

function formatAmt(amount: number, currency: "INR" | "USD"): string {
  if (currency === "INR") return `₹${(amount / 100).toLocaleString("en-IN")}`
  return `$${(amount / 100).toFixed(2)}`
}

interface PurchaseModalProps {
  plugin: PluginCardData
  currency: "INR" | "USD"
  onClose: () => void
  onSuccess: () => void
}

function PurchaseModal({ plugin, currency, onClose, onSuccess }: PurchaseModalProps) {
  const models: { value: "ONE_TIME" | "MONTHLY" | "YEARLY"; label: string; price: string }[] = []
  if (plugin.priceOneTimeINR && plugin.priceOneTimeUSD) {
    models.push({ value: "ONE_TIME", label: "One-time", price: formatAmt(currency === "INR" ? plugin.priceOneTimeINR : plugin.priceOneTimeUSD, currency) })
  }
  if (plugin.priceMonthlyINR && plugin.priceMonthlyUSD) {
    models.push({ value: "MONTHLY", label: "Monthly", price: `${formatAmt(currency === "INR" ? plugin.priceMonthlyINR : plugin.priceMonthlyUSD, currency)}/mo` })
  }
  if (plugin.priceYearlyINR && plugin.priceYearlyUSD) {
    models.push({ value: "YEARLY", label: "Yearly", price: `${formatAmt(currency === "INR" ? plugin.priceYearlyINR : plugin.priceYearlyUSD, currency)}/yr` })
  }

  const [selected, setSelected] = useState<"ONE_TIME" | "MONTHLY" | "YEARLY">(models[0]?.value ?? "ONE_TIME")
  const [loading, setLoading] = useState(false)

  const handlePurchase = async () => {
    setLoading(true)
    try {
      await purchasePluginAction(plugin.id, selected)
      toast.success(`${plugin.name} added to your clinic!`)
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Failed to add plugin")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "var(--paper-raised)", borderRadius: 16, padding: 32, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#14b8a620", color: "#14b8a6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PluginIcon name={plugin.icon} size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{plugin.name}</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{plugin.tagline}</div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 20, lineHeight: 1.55 }}>
          {plugin.description}
        </p>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".04em" }}>Choose billing</div>
          {models.map((m) => (
            <label
              key={m.value}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: 8, marginBottom: 8, cursor: "pointer",
                border: `1.5px solid ${selected === m.value ? "var(--forest)" : "var(--line)"}`,
                background: selected === m.value ? "#1e46381a" : "transparent",
                transition: "all .12s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="radio" checked={selected === m.value} onChange={() => setSelected(m.value)} style={{ accentColor: "var(--forest)" }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>{m.label}</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, color: "var(--forest)" }}>{m.price}</span>
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="cw-btn cw-btn-primary"
            onClick={handlePurchase}
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? "Adding…" : "Add to your clinic"}
          </button>
          <button className="cw-btn cw-btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

interface AddonsClientProps {
  availablePlugins: PluginCardData[]
  ownedPlugins: any[]
  currency: "INR" | "USD"
}

export function AddonsClient({ availablePlugins, ownedPlugins, currency }: AddonsClientProps) {
  const router = useRouter()
  const { confirm } = useConfirm()
  const [purchasePlugin, setPurchasePlugin] = useState<PluginCardData | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleUninstall = async (clinicPluginId: string, pluginName: string) => {
    const ok = await confirm({
      title: "Uninstall Plugin",
      body: `Are you sure you want to uninstall ${pluginName}? You will lose access to its features immediately.`,
      confirmLabel: "Uninstall",
      tone: "danger",
    })
    if (!ok) return

    try {
      await uninstallPluginAction(clinicPluginId)
      router.refresh()
      toast.success(`${pluginName} has been uninstalled.`)
    } catch (err: any) {
      toast.error(err.message || "Failed to uninstall plugin")
    }
  }

  const handleToggle = async (clinicPluginId: string, currentEnabled: boolean) => {
    setTogglingId(clinicPluginId)
    try {
      await togglePluginEnabled(clinicPluginId, !currentEnabled)
      router.refresh()
      toast.success(currentEnabled ? "Plugin paused" : "Plugin enabled")
    } catch (err: any) {
      toast.error(err.message || "Failed to update")
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="cw">
      <div style={{ padding: "32px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)", marginBottom: 6 }}>Add-ons</h1>
          <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>
            Extend your clinic with powerful plugins. Buy only what you need — plugins are separate from your plan.
          </p>
        </div>

        {/* Owned plugins */}
        {ownedPlugins.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <div className="cw-addons-section-title">Your add-ons</div>
            <div className="cw-addons-grid">
              {ownedPlugins.map((cp) => {
                const p = cp.plugin
                const Icon = ICON_MAP[p.icon] || Puzzle
                const categoryColor = p.category === "Clinical" ? "#14b8a6" : "#8b5cf6"
                return (
                  <div key={cp.id} className="cw-myaddon-card" style={{ padding: 20, gap: 0, justifyContent: "space-between", height: "100%" }}>
                    <div>
                      {/* Top Row: Icon, Name, Toggle */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{
                            width: 48, height: 48, borderRadius: "50%",
                            background: `${categoryColor}15`, color: categoryColor,
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                          }}>
                            <Icon size={24} />
                          </div>
                          <div>
                            <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", margin: "0 0 4px" }}>
                              {p.name}
                            </h3>
                            <span style={{
                              fontSize: 10.5, fontWeight: 600, color: categoryColor,
                              border: `1px solid ${categoryColor}40`, padding: "1px 8px", borderRadius: 12
                            }}>
                              {p.category}
                            </span>
                          </div>
                        </div>
                        {/* Toggle switch */}
                        <label className="cw-toggle-label" style={{ margin: 0 }}>
                          <div
                            onClick={() => handleToggle(cp.id, cp.isEnabled)}
                            style={{
                              width: 44, height: 24, borderRadius: 12, cursor: "pointer",
                              background: cp.isEnabled ? "var(--forest)" : "#d1d5db",
                              position: "relative", transition: "background .15s", flexShrink: 0,
                            }}
                          >
                            <div style={{
                              position: "absolute", top: 3, left: cp.isEnabled ? 23 : 3,
                              width: 18, height: 18, borderRadius: "50%", background: "#fff",
                              transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                            }} />
                          </div>
                        </label>
                      </div>

                      <ExpandableDescription text={p.description || p.tagline} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <button 
                          style={{ 
                            background: "transparent", border: "none", padding: 0, 
                            fontSize: 13.5, fontWeight: 700, color: "var(--ink)", 
                            cursor: "pointer", textDecoration: "underline", textAlign: "left" 
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = "var(--coral)"}
                          onMouseLeave={(e) => e.currentTarget.style.color = "var(--ink)"}
                          onClick={() => handleUninstall(cp.id, p.name)}
                        >
                          Uninstall
                        </button>
                        <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
                          {cp.pricingModel !== "ONE_TIME" && cp.currentPeriodEnd ? (
                            <span>Renews {new Date(cp.currentPeriodEnd).toLocaleDateString()}</span>
                          ) : cp.pricingModel === "ONE_TIME" ? (
                            <span>Lifetime access</span>
                          ) : (
                            <span>{cp.grantedByAdmin ? "Granted by admin" : ""}</span>
                          )}
                        </div>
                      </div>

                      <button
                        style={{
                          padding: "8px 24px", borderRadius: 8, fontSize: 13.5, fontWeight: 600,
                          background: "transparent", color: "var(--forest)", border: "1.5px solid var(--forest)",
                          cursor: "pointer", transition: "all .15s"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--forest)";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--forest)";
                        }}
                        onClick={() => {
                          if (p.slug === "e-prescriptions") router.push("/dashboard/prescriptions")
                          else if (p.slug === "inventory-management") router.push("/dashboard/inventory")
                          else if (p.slug === "video-consultation") router.push("/dashboard/appointments")
                          else toast.info("Plugin configuration coming soon!")
                        }}
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Available plugins */}
        {availablePlugins.length > 0 && (
          <section>
            <div className="cw-addons-section-title">Available plugins</div>
            <p className="cw-addons-section-desc">
              Add any of these to your clinic. You can enable or disable them anytime after purchase.
            </p>
            <div className="cw-addons-grid">
              {availablePlugins.map((plugin) => (
                <PluginCard
                  key={plugin.id}
                  plugin={plugin}
                  currency={currency}
                  variant="addons"
                  onPurchase={(p) => setPurchasePlugin(p)}
                />
              ))}
            </div>
          </section>
        )}

        {availablePlugins.length === 0 && ownedPlugins.length > 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-soft)" }}>
            <CheckCircle size={32} style={{ color: "var(--forest)", marginBottom: 12 }} />
            <p style={{ fontWeight: 600 }}>You have all available plugins!</p>
          </div>
        )}

        {availablePlugins.length === 0 && ownedPlugins.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-soft)" }}>
            <Puzzle size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>No plugins available yet. Check back soon.</p>
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {purchasePlugin && (
        <PurchaseModal
          plugin={purchasePlugin}
          currency={currency}
          onClose={() => setPurchasePlugin(null)}
          onSuccess={() => {
            setPurchasePlugin(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
