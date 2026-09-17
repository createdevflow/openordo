"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createPlan, updatePlan, updatePlanFeatures } from "@/server/actions/admin/plans"
import { Check, CheckCircle2, Plus, X } from "lucide-react"

const FEATURE_CATEGORIES = ["Core", "Scheduling", "Billing", "Communication", "Support"]

export function PlanBuilderClient({
  plan,
  allFeatures,
  includedFeatureIds: initialIncluded,
}: {
  plan: any | null
  allFeatures: any[]
  includedFeatureIds: string[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  // Plan basics
  const [name, setName] = useState(plan?.name || "")
  const [slug, setSlug] = useState(plan?.slug || "")
  const [description, setDescription] = useState(plan?.description || "")
  
  const [priceMonthlyUsd, setPriceMonthlyUsd] = useState(plan?.priceMonthlyUsd ?? 0)
  const [priceYearlyUsd, setPriceYearlyUsd] = useState(plan?.priceYearlyUsd ?? "")
  const [priceMonthlyInr, setPriceMonthlyInr] = useState(plan?.priceMonthlyInr ?? 0)
  const [priceYearlyInr, setPriceYearlyInr] = useState(plan?.priceYearlyInr ?? "")
  
  const [patientLimit, setPatientLimit] = useState(plan?.patientLimit ?? "")
  const [doctorLimit, setDoctorLimit] = useState(plan?.doctorLimit ?? "")
  const [isFeatured, setIsFeatured] = useState(plan?.isFeatured ?? false)
  const [isActive, setIsActive] = useState(plan?.isActive ?? true)
  const [isDefaultFree, setIsDefaultFree] = useState(plan?.isDefaultFree ?? false)
  const [sortOrder, setSortOrder] = useState(plan?.sortOrder ?? 0)

  // Feature checklist
  const [includedIds, setIncludedIds] = useState<Set<string>>(new Set(initialIncluded))

  const toggleFeature = (featureId: string) => {
    setIncludedIds(prev => {
      const next = new Set(prev)
      if (next.has(featureId)) next.delete(featureId)
      else next.add(featureId)
      return next
    })
  }

  // Extra bullets
  const initialBullets = (() => {
    try { return plan?.features ? JSON.parse(plan.features) : [] }
    catch { return [] }
  })()
  const [bullets, setBullets] = useState<string[]>(initialBullets)

  // Preview toggle
  const [previewCurrency, setPreviewCurrency] = useState<"USD" | "INR">("USD")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)

    const data = {
      name, slug, description,
      priceMonthlyUsd: Number(priceMonthlyUsd),
      priceYearlyUsd: priceYearlyUsd !== "" ? Number(priceYearlyUsd) : null,
      priceMonthlyInr: Number(priceMonthlyInr),
      priceYearlyInr: priceYearlyInr !== "" ? Number(priceYearlyInr) : null,
      patientLimit: patientLimit !== "" ? Number(patientLimit) : null,
      doctorLimit: doctorLimit !== "" ? Number(doctorLimit) : null,
      features: JSON.stringify(bullets.filter(b => b.trim())),
      isFeatured, isActive, isDefaultFree,
      sortOrder: Number(sortOrder),
    }

    try {
      const res = plan ? await updatePlan(plan.id, data) : await createPlan(data)
      if (!res.ok) { toast.error(res.error || "Failed to save"); setPending(false); return }

      const planId = plan?.id || (res as any).planId
      if (planId && allFeatures.length > 0) {
        await updatePlanFeatures(planId, Array.from(includedIds))
      }

      toast.success("Plan saved")
      router.push("/admin/plans")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed")
      setPending(false)
    }
  }

  // Live preview helpers
  const previewFeatureLines = [
    ...allFeatures.filter(f => includedIds.has(f.id)).map(f => f.name),
    ...bullets.filter(b => b.trim()),
  ]
  
  const previewPrice = previewCurrency === "USD" ? priceMonthlyUsd : priceMonthlyInr
  const currencySymbol = previewCurrency === "USD" ? "$" : "₹"

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "flex-start" }} data-plan-builder-grid>

        {/* LEFT: Plan basics */}
        <div className="adm-card">
          <div className="adm-card-head"><div className="adm-card-title">Plan Details</div></div>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="adm-label">Name</label>
                <input className="adm-input" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <label className="adm-label">Slug</label>
                <input className="adm-input adm-mono" value={slug} onChange={e => setSlug(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="adm-label">Description</label>
              <input className="adm-input" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            
            <div className="adm-section-label" style={{ marginTop: 8 }}>USD Pricing</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="adm-label">Monthly ($)</label>
                <input className="adm-input adm-mono" type="number" value={priceMonthlyUsd} onChange={e => setPriceMonthlyUsd(Number(e.target.value))} required />
              </div>
              <div>
                <label className="adm-label">Yearly ($)</label>
                <input className="adm-input adm-mono" type="number" value={priceYearlyUsd} onChange={e => setPriceYearlyUsd(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="adm-section-label" style={{ marginTop: 8 }}>INR Pricing</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="adm-label">Monthly (₹)</label>
                <input className="adm-input adm-mono" type="number" value={priceMonthlyInr} onChange={e => setPriceMonthlyInr(Number(e.target.value))} required />
              </div>
              <div>
                <label className="adm-label">Yearly (₹)</label>
                <input className="adm-input adm-mono" type="number" value={priceYearlyInr} onChange={e => setPriceYearlyInr(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="adm-section-label" style={{ marginTop: 8 }}>Limits & Settings</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 12 }}>
              <div>
                <label className="adm-label">Patient Limit (blank = ∞)</label>
                <input className="adm-input adm-mono" type="number" value={patientLimit} onChange={e => setPatientLimit(e.target.value)} />
              </div>
              <div>
                <label className="adm-label">Doctor Limit (blank = ∞)</label>
                <input className="adm-input adm-mono" type="number" value={doctorLimit} onChange={e => setDoctorLimit(e.target.value)} />
              </div>
              <div>
                <label className="adm-label">Sort Order</label>
                <input className="adm-input adm-mono" type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 4 }}>
              {[
                { label: "Active", val: isActive, set: setIsActive },
                { label: "Featured (Most Popular)", val: isFeatured, set: setIsFeatured },
                { label: "Default Free Plan", val: isDefaultFree, set: setIsDefaultFree },
              ].map(({ label, val, set }) => (
                <label key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer" }}>
                  <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} style={{ accentColor: "var(--adm-accent)", width: 16, height: 16 }} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Extra bullets */}
          <div style={{ padding: "0 20px 20px" }}>
            <label className="adm-label" style={{ marginBottom: 8 }}>Additional Bullets (marketing only, not toggle-able features)</label>
            {bullets.map((b, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  className="adm-input"
                  value={b}
                  onChange={e => { const n = [...bullets]; n[i] = e.target.value; setBullets(n) }}
                  placeholder="e.g. Priority email support"
                />
                <button type="button" className="adm-btn adm-btn-ghost adm-btn-icon" onClick={() => setBullets(bullets.filter((_, idx) => idx !== i))}>
                  <X size={14} />
                </button>
              </div>
            ))}
            <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" style={{ marginTop: 4 }} onClick={() => setBullets([...bullets, ""])}>
              <Plus size={14} /> Add bullet
            </button>
          </div>
        </div>

        {/* RIGHT: Feature checklist & Preview */}
        <div>
          <div className="adm-card" style={{ marginBottom: 20 }}>
            <div className="adm-card-head"><div className="adm-card-title">Features Included in this Plan</div></div>
            {allFeatures.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--adm-muted)", fontSize: 13.5 }}>
                No features in the catalog yet. Add them in Settings → Feature Catalog.
              </div>
            ) : (
              FEATURE_CATEGORIES.map(cat => {
                const catFeats = allFeatures.filter(f => f.category === cat)
                if (catFeats.length === 0) return null
                return (
                  <div key={cat}>
                    <div style={{ padding: "10px 16px 4px", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "var(--adm-muted)", borderBottom: "1px solid var(--adm-border)", background: "var(--adm-bg)" }}>
                      {cat}
                    </div>
                    {catFeats.map((f: any) => (
                      <label key={f.id} style={{
                        display: "flex", alignItems: "flex-start", gap: 12,
                        padding: "11px 16px",
                        borderBottom: "1px solid var(--adm-border)",
                        cursor: "pointer",
                        background: includedIds.has(f.id) ? "rgba(30,70,56,0.04)" : "transparent",
                        transition: "background 0.1s",
                      }}>
                        <input
                          type="checkbox"
                          checked={includedIds.has(f.id)}
                          onChange={() => toggleFeature(f.id)}
                          style={{ accentColor: "var(--adm-accent)", width: 16, height: 16, marginTop: 1, flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: includedIds.has(f.id) ? 600 : 400, color: "var(--adm-text)" }}>
                            {f.name}
                          </div>
                          {f.description && (
                            <div style={{ fontSize: 12, color: "var(--adm-muted)", marginTop: 2 }}>{f.description}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )
              })
            )}
          </div>

          {/* Live pricing preview */}
          <div className="adm-card" style={{ background: "#123025", border: "none", color: "#fff" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "rgba(255,255,255,0.4)" }}>
                Live Preview
              </div>
              <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: 20, padding: 2 }}>
                {(["USD", "INR"] as const).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPreviewCurrency(c)}
                    style={{
                      padding: "4px 10px", fontSize: 11, fontWeight: 700, borderRadius: 20, border: "none", cursor: "pointer",
                      background: previewCurrency === c ? "#C8862B" : "transparent",
                      color: previewCurrency === c ? "#fff" : "rgba(255,255,255,0.5)"
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4, color: "#fff" }}>{name || "Plan Name"}</div>
              <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 16, color: "#fff", fontFamily: "var(--font-fraunces, serif)" }}>
                {previewPrice === 0 ? "Free" : `${currencySymbol}${Number(previewPrice).toLocaleString()}`}
                {previewPrice > 0 && <span style={{ fontSize: 16, fontWeight: 400, opacity: 0.6 }}>/mo</span>}
              </div>
              {previewFeatureLines.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {previewFeatureLines.map((feat, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
                      <CheckCircle2 size={16} style={{ color: "#C8862B", flexShrink: 0 }} />
                      <span style={{ color: "rgba(255,255,255,0.85)" }}>{feat}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
                  Check features on the left to see them here…
                </div>
              )}
              {isFeatured && (
                <div style={{ marginTop: 16, display: "inline-block", background: "#C8862B", color: "#fff", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", padding: "3px 10px", borderRadius: 20 }}>
                  Most Popular
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save / Cancel */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={() => router.back()}>Cancel</button>
        <button type="submit" className="adm-btn adm-btn-primary" disabled={pending}>
          <Check size={16} /> {pending ? "Saving…" : "Save Plan"}
        </button>
      </div>
    </form>
  )
}
