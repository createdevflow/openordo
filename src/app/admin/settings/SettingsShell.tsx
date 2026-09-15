"use client"

import * as Tabs from "@radix-ui/react-tabs"
import * as Switch from "@radix-ui/react-switch"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { togglePlatformFlag, toggleFeatureGlobal, createFeature, deleteFeature } from "@/server/actions/admin/flags"
import { saveGlobalSettings, uploadBrandingAsset, sendTestEmailAction } from "@/server/actions/admin/global-settings"
import { updateAdminCredentials } from "@/server/actions/admin/settings"
import { ShieldAlert, Zap, Package, Palette, User, AlertTriangle, Plus, Trash2, Globe, Mail } from "lucide-react"

const FEATURE_CATEGORIES = ["Core", "Scheduling", "Billing", "Communication", "Support"]

export function SettingsShell({ flags, features, plans, globalSettings, adminEmail }: {
  flags: any[]
  features: any[]
  plans: any[]
  globalSettings: Record<string, string>
  adminEmail: string
}) {
  const { confirm } = useConfirm()
  const [, startTransition] = useTransition()

  // Feature Flags tab
  const flagsByCategory = flags.reduce((acc: Record<string, any[]>, f) => {
    if (!acc[f.category]) acc[f.category] = []
    acc[f.category].push(f)
    return acc
  }, {})

  const handleFlagToggle = async (flag: any, newVal: boolean) => {
    const isDangerous = ["MAINTENANCE_MODE", "PUBLIC_REGISTRATION"].includes(flag.key)
    if (isDangerous && !newVal) {
      const ok = await confirm({
        title: `Disable "${flag.label}"?`,
        body: flag.description,
        confirmLabel: "Yes, disable",
        tone: "danger",
      })
      if (!ok) return
    }
    toast.promise(togglePlatformFlag(flag.key, newVal), {
      loading: "Updating…",
      success: newVal ? "Feature enabled" : "Feature disabled",
      error: "Failed to update flag",
    })
  }

  // Feature Catalog tab
  const featuresByCategory = FEATURE_CATEGORIES.reduce((acc: Record<string, any[]>, cat) => {
    acc[cat] = features.filter(f => f.category === cat)
    return acc
  }, {})

  const [showNewFeature, setShowNewFeature] = useState(false)
  const [newFeature, setNewFeature] = useState({ key: "", name: "", description: "", category: "Core" })

  const handleCreateFeature = async () => {
    if (!newFeature.key || !newFeature.name) return
    toast.promise(createFeature(newFeature), {
      loading: "Creating…",
      success: () => { setShowNewFeature(false); setNewFeature({ key: "", name: "", description: "", category: "Core" }); return "Feature created" },
      error: "Failed to create feature",
    })
  }

  const handleDeleteFeature = async (feature: any) => {
    const ok = await confirm({
      title: `Delete "${feature.name}"?`,
      body: "This will remove the feature from all plans that use it.",
      tone: "danger",
    })
    if (!ok) return
    toast.promise(deleteFeature(feature.id), { loading: "Deleting…", success: "Feature deleted", error: "Failed" })
  }

  // Account tab
  const [email, setEmail] = useState(adminEmail)
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [savingAccount, setSavingAccount] = useState(false)

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingAccount(true)
    toast.promise(updateAdminCredentials({ email, currentPassword: currentPw, newPassword: newPw || undefined }), {
      loading: "Saving…",
      success: () => { setCurrentPw(""); setNewPw(""); setSavingAccount(false); return "Credentials updated" },
      error: (err: any) => { setSavingAccount(false); return err.message || "Failed" },
    })
  }

  // Global Settings State
  const [smtpSettings, setSmtpSettings] = useState({
    SMTP_HOST: globalSettings.SMTP_HOST || "",
    SMTP_PORT: globalSettings.SMTP_PORT || "587",
    SMTP_USER: globalSettings.SMTP_USER || "",
    SMTP_PASS: globalSettings.SMTP_PASS || "",
    SMTP_FROM: globalSettings.SMTP_FROM || "",
    SMTP_FROM_AUTH: globalSettings.SMTP_FROM_AUTH || "",
    SMTP_FROM_BILLING: globalSettings.SMTP_FROM_BILLING || "",
    SMTP_FROM_GENERAL: globalSettings.SMTP_FROM_GENERAL || "",
  })
  const [seoSettings, setSeoSettings] = useState({
    SEO_META_TITLE: globalSettings.SEO_META_TITLE || "OpenORDO Admin",
    SEO_META_DESC: globalSettings.SEO_META_DESC || "Automating your clinic",
    SEO_FAVICON_URL: globalSettings.SEO_FAVICON_URL || "",
    SEO_OG_IMAGE_URL: globalSettings.SEO_OG_IMAGE_URL || "",
  })
  const [paymentSettings, setPaymentSettings] = useState({
    STRIPE_SECRET_KEY: globalSettings.STRIPE_SECRET_KEY || "",
    STRIPE_WEBHOOK_SECRET: globalSettings.STRIPE_WEBHOOK_SECRET || "",
    STRIPE_PUBLIC_KEY: globalSettings.STRIPE_PUBLIC_KEY || "",
  })

  const [savingGlobal, setSavingGlobal] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [testingEmail, setTestingEmail] = useState(false)
  
  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error("Please enter an email address")
      return
    }
    setTestingEmail(true)
    toast.promise(
      sendTestEmailAction(testEmail, smtpSettings).then(res => {
        if ((res as any).error) throw new Error((res as any).error)
        return res
      }), 
      {
        loading: "Sending test email…",
        success: () => { setTestingEmail(false); return "Test email sent successfully!" },
        error: (err: any) => { setTestingEmail(false); return err.message || "Failed to send test email" },
      }
    )
  }
  
  const handleSaveGlobal = async (settingsToSave: Record<string, string>) => {
    setSavingGlobal(true)
    toast.promise(
      saveGlobalSettings(settingsToSave).then(res => {
        if ((res as any).error) throw new Error((res as any).error)
        return res
      }),
      {
        loading: "Saving settings…",
        success: () => { setSavingGlobal(false); return "Settings updated" },
        error: (err: any) => { setSavingGlobal(false); return err.message || "Failed to save settings" },
      }
    )
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)
    formData.append("key", key)

    setSavingGlobal(true)
    try {
      const res = await uploadBrandingAsset(formData)
      if (res.success && res.url) {
        if (key === "SEO_FAVICON_URL") setSeoSettings(p => ({...p, SEO_FAVICON_URL: res.url}))
        if (key === "SEO_OG_IMAGE_URL") setSeoSettings(p => ({...p, SEO_OG_IMAGE_URL: res.url}))
        toast.success("Image uploaded successfully")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image")
    } finally {
      setSavingGlobal(false)
    }
  }

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-page-title">Settings</h1>
        <span style={{ fontSize: 13, color: "var(--adm-muted)" }}>Control Center</span>
      </div>

      <div className="adm-card" style={{ overflow: "visible" }}>
        <Tabs.Root defaultValue="flags">
          <div className="adm-tabs-list">
            <Tabs.List asChild>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {[
                  { value: "flags", label: "Feature Flags", icon: <Zap size={14} /> },
                  { value: "catalog", label: "Feature Catalog", icon: <Package size={14} /> },
                  { value: "billing", label: "Plans & Billing", icon: <Globe size={14} /> },
                  { value: "email", label: "Email & SMTP", icon: <Mail size={14} /> },
                  { value: "branding", label: "Branding & SEO", icon: <Palette size={14} /> },
                  { value: "account", label: "Account", icon: <User size={14} /> },
                  { value: "danger", label: "Danger Zone", icon: <AlertTriangle size={14} /> },
                ].map(tab => (
                  <Tabs.Trigger key={tab.value} value={tab.value} className="adm-tab-trigger" asChild>
                    <button style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {tab.icon} {tab.label}
                    </button>
                  </Tabs.Trigger>
                ))}
              </div>
            </Tabs.List>
          </div>

          {/* ── Feature Flags ── */}
          <Tabs.Content value="flags" className="adm-tab-content">
            <div style={{ marginBottom: 20 }}>
              <div className="adm-section-label" style={{ marginBottom: 4 }}>Platform Feature Flags</div>
              <p style={{ fontSize: 13.5, color: "var(--adm-muted)", margin: 0 }}>
                Turn parts of the platform on or off without a code deploy. Every toggle writes to the Audit Log.
              </p>
            </div>

            {Object.entries(flagsByCategory).map(([category, catFlags]) => (
              <div key={category} style={{ marginBottom: 32 }}>
                <div className="adm-section-label" style={{ marginBottom: 12 }}>{category}</div>
                {(catFlags as any[]).map(flag => (
                  <div key={flag.key} className="adm-toggle-row">
                    <div className="adm-toggle-info">
                      <div className="adm-toggle-label">{flag.label}</div>
                      <div className="adm-toggle-desc">{flag.description}</div>
                      {!flag.enabled && (
                        <div className="adm-toggle-meta">⚠ Currently disabled</div>
                      )}
                    </div>
                    <Switch.Root
                      checked={flag.enabled}
                      onCheckedChange={(val) => handleFlagToggle(flag, val)}
                      aria-label={flag.label}
                    >
                      <Switch.Thumb />
                    </Switch.Root>
                  </div>
                ))}
              </div>
            ))}

            {flags.length === 0 && (
              <div className="adm-empty">
                <div className="adm-empty-icon"><ShieldAlert size={24} /></div>
                <div className="adm-empty-title">No flags seeded yet</div>
                <div className="adm-empty-desc">
                  Stop the dev server, run <code style={{ fontFamily: "monospace", background: "var(--adm-bg)", padding: "2px 6px", borderRadius: 4 }}>npx tsx prisma/seed.ts</code>, then restart.
                </div>
              </div>
            )}
          </Tabs.Content>

          {/* ── Feature Catalog ── */}
          <Tabs.Content value="catalog" className="adm-tab-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div className="adm-section-label" style={{ marginBottom: 4 }}>Feature Catalog</div>
                <p style={{ fontSize: 13.5, color: "var(--adm-muted)", margin: 0 }}>
                  The master list of product features. Check them in the Plan Builder to include them in a plan.
                </p>
              </div>
              <button className="adm-btn adm-btn-primary" onClick={() => setShowNewFeature(!showNewFeature)}>
                <Plus size={14} /> Add Feature
              </button>
            </div>

            {showNewFeature && (
              <div style={{ background: "var(--adm-bg)", border: "1px solid var(--adm-border)", borderRadius: 10, padding: 20, marginBottom: 20 }}>
                <div className="adm-section-label" style={{ marginBottom: 12 }}>New Feature</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label className="adm-label">Name</label>
                    <input className="adm-input" value={newFeature.name} onChange={e => setNewFeature(p => ({ ...p, name: e.target.value }))} placeholder="Appointment calendar" />
                  </div>
                  <div>
                    <label className="adm-label">Key (unique, dot-notation)</label>
                    <input className="adm-input adm-mono" value={newFeature.key} onChange={e => setNewFeature(p => ({ ...p, key: e.target.value }))} placeholder="scheduling.calendar" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div>
                    <label className="adm-label">Description (optional)</label>
                    <input className="adm-input" value={newFeature.description} onChange={e => setNewFeature(p => ({ ...p, description: e.target.value }))} placeholder="Short description for tooltip" />
                  </div>
                  <div>
                    <label className="adm-label">Category</label>
                    <select className="adm-input" value={newFeature.category} onChange={e => setNewFeature(p => ({ ...p, category: e.target.value }))}>
                      {FEATURE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="adm-btn adm-btn-primary" onClick={handleCreateFeature}>Create Feature</button>
                  <button className="adm-btn adm-btn-ghost" onClick={() => setShowNewFeature(false)}>Cancel</button>
                </div>
              </div>
            )}

            {FEATURE_CATEGORIES.map(cat => {
              const catFeatures = featuresByCategory[cat] || []
              if (catFeatures.length === 0) return null
              return (
                <div key={cat} style={{ marginBottom: 28 }}>
                  <div className="adm-section-label" style={{ marginBottom: 8 }}>{cat}</div>
                  <div className="adm-card" style={{ overflow: "hidden" }}>
                    {catFeatures.map((f: any, i: number) => (
                      <div key={f.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 16px",
                        borderBottom: i < catFeatures.length - 1 ? "1px solid var(--adm-border)" : "none",
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{f.name}</div>
                          <div style={{ fontSize: 12, color: "var(--adm-muted)" }} className="adm-mono">{f.key}</div>
                          {f.description && <div style={{ fontSize: 12.5, color: "var(--adm-muted)", marginTop: 2 }}>{f.description}</div>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <Switch.Root
                            checked={f.isGloballyEnabled}
                            onCheckedChange={(val) => toast.promise(toggleFeatureGlobal(f.id, val), { loading: "Updating…", success: "Updated", error: "Failed" })}
                            aria-label={`Toggle ${f.name}`}
                          >
                            <Switch.Thumb />
                          </Switch.Root>
                          <button className="adm-btn adm-btn-ghost adm-btn-icon adm-btn-sm" onClick={() => handleDeleteFeature(f)} style={{ color: "var(--adm-coral)" }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {features.length === 0 && (
              <div className="adm-empty">
                <div className="adm-empty-icon"><Package size={24} /></div>
                <div className="adm-empty-title">No features yet</div>
                <div className="adm-empty-desc">Add features here, then assign them to plans in the Plan Builder.</div>
                <button className="adm-btn adm-btn-primary" onClick={() => setShowNewFeature(true)}>
                  <Plus size={14} /> Add First Feature
                </button>
              </div>
            )}
          </Tabs.Content>

          {/* ── Plans & Billing ── */}
          <Tabs.Content value="billing" className="adm-tab-content">
            <div className="adm-section-label" style={{ marginBottom: 16 }}>Plans & Billing Defaults</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 }}>
              <div>
                <label className="adm-label">Default Free Plan</label>
                <select className="adm-input">
                  <option value="">— Select default plan —</option>
                  {plans.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.priceMonthlyUsd === 0 ? "Free" : `$${p.priceMonthlyUsd}/mo`})</option>
                  ))}
                </select>
                <p style={{ fontSize: 12.5, color: "var(--adm-muted)", marginTop: 6 }}>
                  New signups are placed on this plan after their trial period.
                </p>
              </div>
              <div>
                <label className="adm-label">Default Trial Length (days)</label>
                <input className="adm-input" type="number" defaultValue={14} style={{ width: 120 }} />
              </div>
              <div>
                <label className="adm-label">Default Currency</label>
                <select className="adm-input" style={{ width: 160 }}>
                  <option value="INR">INR — ₹ Indian Rupee</option>
                  <option value="USD">USD — $ US Dollar</option>
                  <option value="GBP">GBP — £ British Pound</option>
                </select>
              </div>
              <div className="adm-info-box" style={{ marginTop: 8 }}>
                <Zap size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>Stripe mode:</strong> {paymentSettings.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "🟢 Live" : "🟡 Test (no charges)"}
                </span>
              </div>
              <div style={{ marginTop: 16 }}>
                <div className="adm-section-label" style={{ marginBottom: 16 }}>Payment Gateway (Stripe)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label className="adm-label">Stripe Public Key</label>
                    <input className="adm-input" value={paymentSettings.STRIPE_PUBLIC_KEY} onChange={e => setPaymentSettings(p => ({...p, STRIPE_PUBLIC_KEY: e.target.value}))} placeholder="pk_test_..." />
                  </div>
                  <div>
                    <label className="adm-label">Stripe Secret Key</label>
                    <input className="adm-input" type="password" value={paymentSettings.STRIPE_SECRET_KEY} onChange={e => setPaymentSettings(p => ({...p, STRIPE_SECRET_KEY: e.target.value}))} placeholder="sk_test_..." />
                  </div>
                  <div>
                    <label className="adm-label">Stripe Webhook Secret</label>
                    <input className="adm-input" type="password" value={paymentSettings.STRIPE_WEBHOOK_SECRET} onChange={e => setPaymentSettings(p => ({...p, STRIPE_WEBHOOK_SECRET: e.target.value}))} placeholder="whsec_..." />
                  </div>
                </div>
              </div>
              <button className="adm-btn adm-btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => handleSaveGlobal(paymentSettings)} disabled={savingGlobal}>
                {savingGlobal ? "Saving..." : "Save Billing Settings"}
              </button>
            </div>
          </Tabs.Content>

          {/* ── Email & SMTP ── */}
          <Tabs.Content value="email" className="adm-tab-content">
            <div className="adm-section-label" style={{ marginBottom: 16 }}>SMTP Email Configuration</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 }}>
              <div>
                <label className="adm-label">SMTP Host</label>
                <input className="adm-input" value={smtpSettings.SMTP_HOST} onChange={e => setSmtpSettings(p => ({...p, SMTP_HOST: e.target.value}))} placeholder="smtp.gmail.com or smtp.mailtrap.io" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="adm-label">SMTP Port</label>
                  <input className="adm-input" value={smtpSettings.SMTP_PORT} onChange={e => setSmtpSettings(p => ({...p, SMTP_PORT: e.target.value}))} placeholder="587" />
                </div>
                <div>
                  <label className="adm-label">From Address</label>
                  <input className="adm-input" value={smtpSettings.SMTP_FROM} onChange={e => setSmtpSettings(p => ({...p, SMTP_FROM: e.target.value}))} placeholder="OpenORDO <noreply@openordo.com>" />
                </div>
              </div>
              <div>
                <label className="adm-label">SMTP Username</label>
                <input className="adm-input" value={smtpSettings.SMTP_USER} onChange={e => setSmtpSettings(p => ({...p, SMTP_USER: e.target.value}))} />
                <p className="text-[11px] text-ink-soft mt-1">If using aliases, this MUST be the primary mailbox address.</p>
              </div>
              <div>
                <label className="adm-label">SMTP Password</label>
                <input className="adm-input" type="password" value={smtpSettings.SMTP_PASS} onChange={e => setSmtpSettings(p => ({...p, SMTP_PASS: e.target.value}))} />
              </div>
              <button className="adm-btn adm-btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => handleSaveGlobal(smtpSettings)} disabled={savingGlobal}>
                {savingGlobal ? "Saving..." : "Save SMTP Settings"}
              </button>
            </div>

            <hr style={{ border: 0, borderTop: "1px solid var(--adm-border)", margin: "32px 0", maxWidth: 520 }} />

            <div className="adm-section-label" style={{ marginBottom: 16 }}>Email Routing (Optional)</div>
            <p style={{ fontSize: 13, color: "var(--adm-muted)", marginBottom: 16, maxWidth: 520 }}>
              Specify different sender addresses for different types of emails. If left blank, the default "From Address" above will be used. You can use full formats like <code>Billing &lt;billing@openordo.com&gt;</code>.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 }}>
              <div>
                <label className="adm-label">Auth & Security (OTP, Password Reset)</label>
                <input className="adm-input" value={smtpSettings.SMTP_FROM_AUTH} onChange={e => setSmtpSettings(p => ({...p, SMTP_FROM_AUTH: e.target.value}))} placeholder="e.g. Auth <security@openordo.com>" />
              </div>
              <div>
                <label className="adm-label">Billing & Subscriptions (Invoices, Receipts)</label>
                <input className="adm-input" value={smtpSettings.SMTP_FROM_BILLING} onChange={e => setSmtpSettings(p => ({...p, SMTP_FROM_BILLING: e.target.value}))} placeholder="e.g. Billing <billing@openordo.com>" />
              </div>
              <div>
                <label className="adm-label">General (System Alerts, General Info)</label>
                <input className="adm-input" value={smtpSettings.SMTP_FROM_GENERAL} onChange={e => setSmtpSettings(p => ({...p, SMTP_FROM_GENERAL: e.target.value}))} placeholder="e.g. OpenORDO <hello@openordo.com>" />
              </div>
              <button className="adm-btn adm-btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => handleSaveGlobal(smtpSettings)} disabled={savingGlobal}>
                {savingGlobal ? "Saving..." : "Save Routing Settings"}
              </button>
            </div>

            <hr style={{ border: 0, borderTop: "1px solid var(--adm-border)", margin: "32px 0", maxWidth: 520 }} />

            <div className="adm-section-label" style={{ marginBottom: 16 }}>Test Configuration</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 520, background: "var(--adm-bg)", padding: 20, borderRadius: 8, border: "1px solid var(--adm-border)" }}>
              <p style={{ fontSize: 13, margin: 0, color: "var(--adm-muted)" }}>Send a test email to verify your SMTP settings and routing are working correctly. (Uses General Routing)</p>
              <div style={{ display: "flex", gap: 12 }}>
                <input className="adm-input" type="email" placeholder="Test email address" value={testEmail} onChange={e => setTestEmail(e.target.value)} style={{ flex: 1 }} />
                <button className="adm-btn adm-btn-primary" onClick={handleTestEmail} disabled={testingEmail}>
                  {testingEmail ? "Sending..." : "Send Test"}
                </button>
              </div>
            </div>
          </Tabs.Content>

          {/* ── Branding ── */}
          <Tabs.Content value="branding" className="adm-tab-content">
            <div className="adm-section-label" style={{ marginBottom: 16 }}>Platform Branding & SEO</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 }}>
              <div>
                <label className="adm-label">Admin Panel Display Name</label>
                <input className="adm-input" value={seoSettings.SEO_META_TITLE} onChange={e => setSeoSettings(p => ({...p, SEO_META_TITLE: e.target.value}))} />
                <p style={{ fontSize: 12.5, color: "var(--adm-muted)", marginTop: 6 }}>Shown in the topbar and browser title.</p>
              </div>
              <div>
                <label className="adm-label">Meta Description</label>
                <input className="adm-input" value={seoSettings.SEO_META_DESC} onChange={e => setSeoSettings(p => ({...p, SEO_META_DESC: e.target.value}))} />
              </div>
              <div>
                <label className="adm-label">Favicon</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {seoSettings.SEO_FAVICON_URL && (
                    <img src={seoSettings.SEO_FAVICON_URL} alt="Favicon" style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover", background: "#fff", border: "1px solid var(--adm-border)" }} />
                  )}
                  <input className="adm-input" type="file" accept="image/png, image/jpeg, image/x-icon, image/svg+xml" onChange={e => handleFileUpload(e, "SEO_FAVICON_URL")} disabled={savingGlobal} />
                </div>
              </div>
              <div>
                <label className="adm-label">OpenGraph (OG) Image</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {seoSettings.SEO_OG_IMAGE_URL && (
                    <img src={seoSettings.SEO_OG_IMAGE_URL} alt="OG Image" style={{ width: "100%", maxWidth: 300, borderRadius: 8, objectFit: "cover", background: "#fff", border: "1px solid var(--adm-border)" }} />
                  )}
                  <input className="adm-input" type="file" accept="image/png, image/jpeg, image/webp" onChange={e => handleFileUpload(e, "SEO_OG_IMAGE_URL")} disabled={savingGlobal} />
                </div>
                <p style={{ fontSize: 12.5, color: "var(--adm-muted)", marginTop: 6 }}>This image appears when a link to your site is shared on social media.</p>
              </div>
              <button className="adm-btn adm-btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => handleSaveGlobal(seoSettings)} disabled={savingGlobal}>
                {savingGlobal ? "Saving..." : "Save Branding & SEO"}
              </button>
            </div>
          </Tabs.Content>

          {/* ── Account ── */}
          <Tabs.Content value="account" className="adm-tab-content">
            <div className="adm-section-label" style={{ marginBottom: 16 }}>Admin Account Credentials</div>
            <form onSubmit={handleSaveCredentials} style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="adm-label">Email</label>
                <input className="adm-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="adm-label">Current Password</label>
                <input className="adm-input" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Required to make changes" />
              </div>
              <div>
                <label className="adm-label">New Password (leave blank to keep current)</label>
                <input className="adm-input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} />
              </div>
              <button type="submit" className="adm-btn adm-btn-primary" disabled={savingAccount} style={{ alignSelf: "flex-start" }}>
                {savingAccount ? "Saving…" : "Update Credentials"}
              </button>
            </form>
          </Tabs.Content>

          {/* ── Danger Zone ── */}
          <Tabs.Content value="danger" className="adm-tab-content">
            <div className="adm-danger-zone">
              <div className="adm-danger-zone-title">
                <AlertTriangle size={16} /> Danger Zone
              </div>
              <p style={{ fontSize: 13.5, color: "var(--adm-muted)", marginBottom: 20 }}>
                These actions have platform-wide or irreversible effects. Proceed with caution.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Maintenance mode shortcut */}
                {(() => {
                  const mFlag = flags.find(f => f.key === "MAINTENANCE_MODE")
                  return mFlag ? (
                    <div className="adm-toggle-row" style={{ borderBottom: "none", paddingBottom: 0 }}>
                      <div className="adm-toggle-info">
                        <div className="adm-toggle-label" style={{ color: "var(--adm-coral)" }}>Maintenance Mode</div>
                        <div className="adm-toggle-desc">Locks out all non-admin routes. Activate only during planned maintenance.</div>
                      </div>
                      <Switch.Root
                        checked={mFlag.enabled}
                        onCheckedChange={(val) => handleFlagToggle(mFlag, val)}
                        aria-label="Maintenance mode"
                      >
                        <Switch.Thumb />
                      </Switch.Root>
                    </div>
                  ) : null
                })()}

                {process.env.NODE_ENV !== "production" && (
                  <div style={{ paddingTop: 16, borderTop: "1px solid rgba(181,67,47,0.2)" }}>
                    <div className="adm-toggle-label" style={{ marginBottom: 6 }}>Reset Demo Data</div>
                    <div className="adm-toggle-desc" style={{ marginBottom: 12 }}>
                      Wipes all patients, appointments, and invoices for demo/staging use only. Not shown in production.
                    </div>
                    <button className="adm-btn adm-btn-danger">Reset Demo Data</button>
                  </div>
                )}
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  )
}
