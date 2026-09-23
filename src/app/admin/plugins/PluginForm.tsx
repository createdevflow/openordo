"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createPlugin, updatePlugin } from "@/server/actions/admin/plugins"
import { PluginCard } from "@/components/ui/PluginCard"

const CATEGORIES = ["Clinical", "Operations"]
const ICONS = ["Video", "Package", "FileSignature", "Puzzle", "Zap", "Activity", "Heart", "Microscope", "UserPlus", "Palette", "HardDrive"]

interface PluginFormProps {
  plugin?: any // existing plugin data for edit mode
}

export function PluginForm({ plugin }: PluginFormProps) {
  const router = useRouter()
  const isEdit = !!plugin

  const [form, setForm] = useState({
    name: plugin?.name ?? "",
    slug: plugin?.slug ?? "",
    tagline: plugin?.tagline ?? "",
    description: plugin?.description ?? "",
    category: plugin?.category ?? "Clinical",
    icon: plugin?.icon ?? "Puzzle",
    kind: plugin?.kind ?? "FEATURE_UNLOCK",
    isActive: plugin?.isActive ?? true,
    isComingSoon: plugin?.isComingSoon ?? false,
    sortOrder: plugin?.sortOrder ?? 0,
    // pricing
    oneTimeEnabled: !!(plugin?.priceOneTimeINR),
    priceOneTimeINR: plugin?.priceOneTimeINR ? String(plugin.priceOneTimeINR / 100) : "",
    priceOneTimeUSD: plugin?.priceOneTimeUSD ? String(plugin.priceOneTimeUSD / 100) : "",
    monthlyEnabled: !!(plugin?.priceMonthlyINR),
    priceMonthlyINR: plugin?.priceMonthlyINR ? String(plugin.priceMonthlyINR / 100) : "",
    priceMonthlyUSD: plugin?.priceMonthlyUSD ? String(plugin.priceMonthlyUSD / 100) : "",
    yearlyEnabled: !!(plugin?.priceYearlyINR),
    priceYearlyINR: plugin?.priceYearlyINR ? String(plugin.priceYearlyINR / 100) : "",
    priceYearlyUSD: plugin?.priceYearlyUSD ? String(plugin.priceYearlyUSD / 100) : "",
  })
  const [saving, setSaving] = useState(false)

  // Auto-generate slug from name (new only)
  useEffect(() => {
    if (!isEdit) {
      setForm(f => ({ ...f, slug: f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }))
    }
  }, [form.name, isEdit])

  const previewPlugin = {
    id: "preview",
    slug: form.slug,
    name: form.name || "Plugin Name",
    tagline: form.tagline || "Short tagline goes here.",
    description: form.description || "Longer description of what this plugin does.",
    category: form.category,
    icon: form.icon,
    isComingSoon: form.isComingSoon,
    priceOneTimeINR: form.oneTimeEnabled && form.priceOneTimeINR ? Math.round(parseFloat(form.priceOneTimeINR) * 100) : null,
    priceOneTimeUSD: form.oneTimeEnabled && form.priceOneTimeUSD ? Math.round(parseFloat(form.priceOneTimeUSD) * 100) : null,
    priceMonthlyINR: form.monthlyEnabled && form.priceMonthlyINR ? Math.round(parseFloat(form.priceMonthlyINR) * 100) : null,
    priceMonthlyUSD: form.monthlyEnabled && form.priceMonthlyUSD ? Math.round(parseFloat(form.priceMonthlyUSD) * 100) : null,
    priceYearlyINR: form.yearlyEnabled && form.priceYearlyINR ? Math.round(parseFloat(form.priceYearlyINR) * 100) : null,
    priceYearlyUSD: form.yearlyEnabled && form.priceYearlyUSD ? Math.round(parseFloat(form.priceYearlyUSD) * 100) : null,
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        name: form.name,
        slug: form.slug,
        tagline: form.tagline,
        description: form.description,
        category: form.category,
        icon: form.icon,
        kind: form.kind,
        isActive: form.isActive,
        isComingSoon: form.isComingSoon,
        sortOrder: Number(form.sortOrder),
        priceOneTimeINR: form.oneTimeEnabled && form.priceOneTimeINR ? Math.round(parseFloat(form.priceOneTimeINR) * 100) : null,
        priceOneTimeUSD: form.oneTimeEnabled && form.priceOneTimeUSD ? Math.round(parseFloat(form.priceOneTimeUSD) * 100) : null,
        priceMonthlyINR: form.monthlyEnabled && form.priceMonthlyINR ? Math.round(parseFloat(form.priceMonthlyINR) * 100) : null,
        priceMonthlyUSD: form.monthlyEnabled && form.priceMonthlyUSD ? Math.round(parseFloat(form.priceMonthlyUSD) * 100) : null,
        priceYearlyINR: form.yearlyEnabled && form.priceYearlyINR ? Math.round(parseFloat(form.priceYearlyINR) * 100) : null,
        priceYearlyUSD: form.yearlyEnabled && form.priceYearlyUSD ? Math.round(parseFloat(form.priceYearlyUSD) * 100) : null,
      }
      if (isEdit) {
        await updatePlugin(plugin.id, data)
        toast.success("Plugin updated")
      } else {
        await createPlugin(data)
        toast.success("Plugin created")
        router.push("/admin/plugins")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save plugin")
    } finally {
      setSaving(false)
    }
  }

  function field(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-page-title">{isEdit ? `Edit: ${plugin.name}` : "Create Plugin"}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>

          {/* LEFT — basics */}
          <div className="adm-card" style={{ padding: 24 }}>
            <div className="adm-form-section-title" style={{ marginBottom: 18 }}>Basics</div>

            <div className="adm-field">
              <label className="adm-label">Plugin Name</label>
              <input className="adm-input" value={form.name} onChange={e => field("name", e.target.value)} placeholder="e.g. Video Consultation" required />
            </div>

            <div className="adm-field">
              <label className="adm-label">Slug</label>
              <input className="adm-input adm-mono" value={form.slug} onChange={e => field("slug", e.target.value)} placeholder="video-consultation" required />
            </div>

            <div className="adm-field">
              <label className="adm-label">Tagline <span style={{ color: "var(--adm-muted)", fontWeight: 400 }}>(one line)</span></label>
              <input className="adm-input" value={form.tagline} onChange={e => field("tagline", e.target.value)} placeholder="Short pitch shown on cards" required />
            </div>

            <div className="adm-field">
              <label className="adm-label">Description</label>
              <textarea className="adm-input" rows={3} value={form.description} onChange={e => field("description", e.target.value)} placeholder="Longer copy for the detail card" required />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="adm-field">
                <label className="adm-label">Category</label>
                <select className="adm-input" value={form.category} onChange={e => field("category", e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="adm-field">
                <label className="adm-label">Icon</label>
                <select className="adm-input" value={form.icon} onChange={e => field("icon", e.target.value)}>
                  {ICONS.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
            </div>

            <div className="adm-field">
              <label className="adm-label">Plugin Kind</label>
              <select className="adm-input" value={form.kind} onChange={e => field("kind", e.target.value)}>
                <option value="FEATURE_UNLOCK">FEATURE_UNLOCK — Turns a capability on/off</option>
                <option value="LIMIT_MODIFIER">LIMIT_MODIFIER — Increases a numeric limit (stackable)</option>
              </select>
              {form.kind === "LIMIT_MODIFIER" && (
                <p style={{ fontSize: 12, color: "var(--adm-muted)", marginTop: 4 }}>
                  Clinics can purchase multiple units. Each unit increments the quantity on their ClinicPlugin row.
                </p>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="adm-field">
                <label className="adm-label">Sort Order</label>
                <input className="adm-input" type="number" value={form.sortOrder} onChange={e => field("sortOrder", e.target.value)} />
              </div>
              <div className="adm-field" style={{ paddingTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13.5 }}>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                  Active (visible to clinics)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13.5 }}>
                  <input type="checkbox" checked={form.isComingSoon} onChange={e => setForm(f => ({ ...f, isComingSoon: e.target.checked }))} />
                  Coming Soon (disables purchase)
                </label>
              </div>
            </div>
          </div>

          {/* RIGHT — pricing */}
          <div className="adm-card" style={{ padding: 24 }}>
            <div className="adm-form-section-title" style={{ marginBottom: 18 }}>Pricing</div>

            {/* One-time */}
            <div style={{ border: "1px solid var(--adm-border)", borderRadius: 8, padding: 14, marginBottom: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13.5, marginBottom: form.oneTimeEnabled ? 12 : 0 }}>
                <input type="checkbox" checked={form.oneTimeEnabled} onChange={e => setForm(f => ({ ...f, oneTimeEnabled: e.target.checked }))} />
                One-time purchase
              </label>
              {form.oneTimeEnabled && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="adm-field">
                    <label className="adm-label">Price (INR ₹)</label>
                    <input className="adm-input" type="number" step="0.01" value={form.priceOneTimeINR} onChange={e => field("priceOneTimeINR", e.target.value)} placeholder="2999" />
                  </div>
                  <div className="adm-field">
                    <label className="adm-label">Price (USD $)</label>
                    <input className="adm-input" type="number" step="0.01" value={form.priceOneTimeUSD} onChange={e => field("priceOneTimeUSD", e.target.value)} placeholder="39.99" />
                  </div>
                </div>
              )}
            </div>

            {/* Monthly */}
            <div style={{ border: "1px solid var(--adm-border)", borderRadius: 8, padding: 14, marginBottom: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13.5, marginBottom: form.monthlyEnabled ? 12 : 0 }}>
                <input type="checkbox" checked={form.monthlyEnabled} onChange={e => setForm(f => ({ ...f, monthlyEnabled: e.target.checked }))} />
                Monthly subscription
              </label>
              {form.monthlyEnabled && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="adm-field">
                    <label className="adm-label">Price/mo (INR ₹)</label>
                    <input className="adm-input" type="number" step="0.01" value={form.priceMonthlyINR} onChange={e => field("priceMonthlyINR", e.target.value)} placeholder="999" />
                  </div>
                  <div className="adm-field">
                    <label className="adm-label">Price/mo (USD $)</label>
                    <input className="adm-input" type="number" step="0.01" value={form.priceMonthlyUSD} onChange={e => field("priceMonthlyUSD", e.target.value)} placeholder="14.99" />
                  </div>
                </div>
              )}
            </div>

            {/* Yearly */}
            <div style={{ border: "1px solid var(--adm-border)", borderRadius: 8, padding: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13.5, marginBottom: form.yearlyEnabled ? 12 : 0 }}>
                <input type="checkbox" checked={form.yearlyEnabled} onChange={e => setForm(f => ({ ...f, yearlyEnabled: e.target.checked }))} />
                Yearly subscription
              </label>
              {form.yearlyEnabled && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="adm-field">
                    <label className="adm-label">Price/yr (INR ₹)</label>
                    <input className="adm-input" type="number" step="0.01" value={form.priceYearlyINR} onChange={e => field("priceYearlyINR", e.target.value)} placeholder="8999" />
                  </div>
                  <div className="adm-field">
                    <label className="adm-label">Price/yr (USD $)</label>
                    <input className="adm-input" type="number" step="0.01" value={form.priceYearlyUSD} onChange={e => field("priceYearlyUSD", e.target.value)} placeholder="129.99" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="adm-card" style={{ padding: 24, marginBottom: 24 }}>
          <div className="adm-form-section-title" style={{ marginBottom: 16 }}>Live Preview</div>
          <p style={{ fontSize: 13, color: "var(--adm-muted)", marginBottom: 20 }}>
            This is exactly how the plugin card appears on the landing page and in the clinic's Add-ons page.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            <PluginCard plugin={previewPlugin} currency="INR" variant="addons" />
            <PluginCard plugin={previewPlugin} currency="USD" variant="addons" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
            {saving ? "Saving…" : (isEdit ? "Save Changes" : "Create Plugin")}
          </button>
          <button type="button" className="adm-btn" onClick={() => router.push("/admin/plugins")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
