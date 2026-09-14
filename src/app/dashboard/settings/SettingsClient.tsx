"use client"

import React, { useState, useTransition, useEffect } from "react"
import { 
  updateClinicSettingsAction, 
  updateUserSettingsAction, 
  updateBillingSettingsAction, 
  generateApiKeyAction,
  deleteApiKeyAction,
  changeClinicPlanAction,
  exportClinicDataAction
} from "@/server/actions/settings"
import { Copy, RefreshCw, Eye, EyeOff, ExternalLink, Lock, Check, ArrowUpRight, Sparkles, Download, Calendar, Receipt, Users, X, FileText } from "lucide-react"
import { useConfirm } from "@/components/ui/ConfirmDialog"

export function SettingsClient({ 
  initialClinic, 
  initialUser,
  planDetails,
  allPlans = [],
  initialTab = "clinic"
}: any) {
  const { confirm, showAlert } = useConfirm()
  const [tab, setTab] = useState(initialTab)
  const [apiKey, setApiKey] = useState<string>(() => {
    try { return JSON.parse(initialClinic?.billingConfig || "{}").apiKey || "" } catch { return "" }
  })
  const [newlyGeneratedApiKey, setNewlyGeneratedApiKey] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  
  // Clinic Profile State
  const [clinic, setClinic] = useState(initialClinic || { name: "", type: "General practice", phone: "", address: "", openTime: "09:00", closeTime: "18:00" })
  
  // User Account State
  const [user, setUser] = useState({ name: initialUser?.name || "", email: initialUser?.email || "", password: "" })
  
  // Notification State
  let initialNotifs = { appointmentReminders: true, dailySummary: true, invoiceAlerts: false }
  try {
    if (initialUser?.notificationPrefs) {
      initialNotifs = { ...initialNotifs, ...JSON.parse(initialUser.notificationPrefs) }
    }
  } catch (e) {}
  const [notifs, setNotifs] = useState(initialNotifs)

  // Billing Config State
  let initialBillingConfig: any = {}
  try {
    if (initialClinic?.billingConfig) {
      initialBillingConfig = JSON.parse(initialClinic.billingConfig)
    }
  } catch(e) {}
  const [billing, setBilling] = useState({
    country: initialClinic?.country || "US",
    config: initialBillingConfig
  })

  const [isPending, startTransition] = useTransition()
  const [exportMessage, setExportMessage] = useState("")
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportData, setExportData] = useState<any>(null)
  const [isExportLoading, setIsExportLoading] = useState(false)
  const [exportRange, setExportRange] = useState<"1m" | "3m" | "6m" | "1y" | "custom" | "all">("1m")
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split("T")[0]
  })
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().split("T")[0])

  const isIndia = clinic.country === "IN"

  const [promoTimeLeft, setPromoTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null)

  useEffect(() => {
    if (!planDetails?.promoExpiresAt) return

    const target = new Date(planDetails.promoExpiresAt).getTime()
    const update = () => {
      const now = new Date().getTime()
      const diff = target - now
      if (diff <= 0) {
        setPromoTimeLeft({ d: 0, h: 0, m: 0, s: 0 })
      } else {
        setPromoTimeLeft({
          d: Math.floor(diff / (1000 * 60 * 60 * 24)),
          h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((diff % (1000 * 60)) / 1000)
        })
      }
    }
    
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [planDetails?.promoExpiresAt])

  function downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function getFilenameSuffix() {
    if (!exportData) return new Date().toISOString().split("T")[0]
    if (exportData.range === "custom" && exportData.startDateStr && exportData.endDateStr) {
      return `${exportData.startDateStr}_to_${exportData.endDateStr}`
    }
    if (exportData.range && exportData.range !== "all") {
      return `${exportData.range}_${new Date().toISOString().split("T")[0]}`
    }
    return `all_time_${new Date().toISOString().split("T")[0]}`
  }

  async function fetchExport(range = exportRange, start = customStart, end = customEnd) {
    setIsExportLoading(true)
    try {
      const res = await exportClinicDataAction({
        range,
        startDate: range === "custom" ? start : undefined,
        endDate: range === "custom" ? end : undefined
      })
      setExportData(res)
    } catch (err: any) {
      showAlert({ title: "Export Failed", body: err.message || "Failed to prepare export", tone: "danger" })
    } finally {
      setIsExportLoading(false)
    }
  }

  async function handleOpenExport() {
    setExportModalOpen(true)
    await fetchExport(exportRange, customStart, customEnd)
  }

  function handleSelectRange(newRange: "1m" | "3m" | "6m" | "1y" | "custom" | "all") {
    setExportRange(newRange)
    if (newRange !== "custom") {
      fetchExport(newRange, customStart, customEnd)
    }
  }

  function handleApplyCustomRange() {
    if (!customStart || !customEnd) {
      showAlert({ title: "Invalid Range", body: "Please select both start and end dates.", tone: "neutral" })
      return
    }
    if (new Date(customStart) > new Date(customEnd)) {
      showAlert({ title: "Invalid Range", body: "Start date cannot be after end date.", tone: "danger" })
      return
    }
    fetchExport("custom", customStart, customEnd)
  }

  function handleDownloadAll() {
    if (!exportData) return
    const suffix = getFilenameSuffix()
    const prefix = exportData.clinicSlug || "clinic"
    downloadCSV(exportData.patientsCSV, `${prefix}_patients_${suffix}.csv`)
    setTimeout(() => {
      downloadCSV(exportData.appointmentsCSV, `${prefix}_appointments_${suffix}.csv`)
    }, 250)
    setTimeout(() => {
      downloadCSV(exportData.invoicesCSV, `${prefix}_invoices_${suffix}.csv`)
    }, 500)
    setExportMessage(`Downloaded all 3 files (${exportRange === "custom" ? "Custom Range" : exportRange.toUpperCase()}).`)
  }

  function handleClinicSave() {
    startTransition(async () => {
      try {
        await updateClinicSettingsAction(clinic)
        showAlert({ title: "Success", body: "Clinic profile saved", tone: "primary" })
      } catch (err) {
        console.error(err)
        showAlert({ title: "Error", body: "Failed to save clinic profile", tone: "danger" })
      }
    })
  }

  function handleBillingSave() {
    startTransition(async () => {
      try {
        await updateBillingSettingsAction({
          country: billing.country,
          billingConfig: billing.config
        })
        showAlert({ title: "Success", body: "Billing & Compliance settings saved", tone: "primary" })
      } catch (err) {
        console.error(err)
        showAlert({ title: "Error", body: "Failed to save billing settings", tone: "danger" })
      }
    })
  }

  function handleUserSave() {
    startTransition(async () => {
      try {
        await updateUserSettingsAction({ ...user, notificationPrefs: notifs })
        showAlert({ title: "Success", body: "Account details saved", tone: "primary" })
        setUser({ ...user, password: "" })
      } catch (err) {
        console.error(err)
        showAlert({ title: "Error", body: "Failed to save account details", tone: "danger" })
      }
    })
  }

  function handleNotifsSave() {
    startTransition(async () => {
      try {
        await updateUserSettingsAction({ name: user.name, email: user.email, notificationPrefs: notifs })
        showAlert({ title: "Success", body: "Notification preferences saved", tone: "primary" })
      } catch (err) {
        console.error(err)
        showAlert({ title: "Error", body: "Failed to save notification preferences", tone: "danger" })
      }
    })
  }


  function handlePlanSwitch(planId: string) {
    startTransition(async () => {
      try {
        await changeClinicPlanAction(planId)
        await showAlert({ title: "Plan Updated", body: "Plan updated successfully! Reloading dashboard...", tone: "primary" })
        window.location.reload()
      } catch (err: any) {
        showAlert({ title: "Error", body: err.message || "Failed to change plan", tone: "danger" })
      }
    })
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-[1000px]">
      <aside className="w-full lg:w-[220px] flex-shrink-0 lg:sticky lg:top-24 lg:self-start z-10 bg-paper">
        <nav className="flex flex-col gap-1">
          <button 
            onClick={() => setTab("clinic")}
            className={`w-full text-left px-3 py-2 rounded-md ${tab === "clinic" ? "bg-paper-raised font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "font-medium text-ink-soft hover:text-ink hover:bg-paper-raised"}`}
          >
            Clinic Profile
          </button>
          <button 
            onClick={() => setTab("subscription")}
            className={`w-full text-left px-3 py-2 rounded-md ${tab === "subscription" ? "bg-paper-raised font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "font-medium text-ink-soft hover:text-ink hover:bg-paper-raised"}`}
          >
            Subscription & Plan
          </button>
          <button 
            onClick={() => setTab("billing")}
            className={`w-full text-left px-3 py-2 rounded-md ${tab === "billing" ? "bg-paper-raised font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "font-medium text-ink-soft hover:text-ink hover:bg-paper-raised"}`}
          >
            Billing & Compliance
          </button>
          <button 
            onClick={() => setTab("account")}
            className={`w-full text-left px-3 py-2 rounded-md ${tab === "account" ? "bg-paper-raised font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "font-medium text-ink-soft hover:text-ink hover:bg-paper-raised"}`}
          >
            Account & Export
          </button>
          <button 
            onClick={() => setTab("notifs")}
            className={`w-full text-left px-3 py-2 rounded-md ${tab === "notifs" ? "bg-paper-raised font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "font-medium text-ink-soft hover:text-ink hover:bg-paper-raised"}`}
          >
            Notifications
          </button>
          <button 
            onClick={() => setTab("developer")}
            className={`w-full text-left px-3 py-2 rounded-md ${tab === "developer" ? "bg-paper-raised font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "font-medium text-ink-soft hover:text-ink hover:bg-paper-raised"}`}
          >
            Developer & Booking
          </button>
        </nav>
      </aside>
      
      <main className="flex-1 w-full max-w-4xl pt-1">
      {tab === "clinic" && (
        <div className="bg-white border border-line rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-5 border-b border-line bg-paper-raised">
            <h3 className="text-[17px] font-bold m-0 text-ink">Clinic Profile</h3>
            <p className="text-[13px] text-ink-soft mt-1 mb-0">Manage your clinic&apos;s public information and contact details.</p>
          </div>
          <div className="p-6 flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="cw-field !mb-0"><label>Clinic name</label><input className="cw-input" value={clinic.name} onChange={e => setClinic({ ...clinic, name: e.target.value })} disabled={isPending} /></div>
              <div className="cw-field !mb-0"><label>Clinic type</label>
                <select className="cw-select" value={clinic.type} onChange={e => setClinic({ ...clinic, type: e.target.value })} disabled={isPending}>
                  <option>General practice</option><option>Dental</option><option>Pediatrics</option><option>Physiotherapy</option><option>Multi-specialty</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="cw-field !mb-0"><label>Phone</label><input className="cw-input" value={clinic.phone || ""} onChange={e => setClinic({ ...clinic, phone: e.target.value })} disabled={isPending} /></div>
              <div className="cw-field !mb-0"><label>Address</label><input className="cw-input" value={clinic.address || ""} onChange={e => setClinic({ ...clinic, address: e.target.value })} disabled={isPending} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="cw-field !mb-0"><label>Opens at</label><input className="cw-input" type="time" value={clinic.openTime || "09:00"} onChange={e => setClinic({ ...clinic, openTime: e.target.value })} disabled={isPending} /></div>
              <div className="cw-field !mb-0"><label>Closes at</label><input className="cw-input" type="time" value={clinic.closeTime || "18:00"} onChange={e => setClinic({ ...clinic, closeTime: e.target.value })} disabled={isPending} /></div>
            </div>
          </div>
          <div className="px-6 py-4 bg-paper-raised border-t border-line flex justify-end">
            <button className="cw-btn cw-btn-primary" onClick={handleClinicSave} disabled={isPending}>Save changes</button>
          </div>
        </div>
      )}

      {tab === "subscription" && (
        <div className="flex flex-col gap-6">
          {/* Active Plan Overview */}
          <div className="bg-white border border-line rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-6 py-5 border-b border-line bg-paper-raised flex justify-between items-center">
              <div>
                <h3 className="text-[17px] font-bold m-0 text-ink">Current Subscription</h3>
                <p className="text-[13px] text-ink-soft mt-1 mb-0">Overview of your active plan and features.</p>
              </div>
              <span className="bg-forest text-white text-[12px] font-bold px-3 py-1 rounded-full">
                {planDetails?.planName || "Starter"} · {planDetails?.status || "Active"}
              </span>
            </div>
            <div className="p-6 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                    {planDetails?.planName || "Starter"} Plan
                  </h4>
                  <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 4 }}>
                    Billing cycle: <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{planDetails?.billingCycle || "monthly"}</span>
                  </p>
                </div>
              </div>

              {planDetails?.promoExpiresAt && promoTimeLeft && (
                <div style={{
                  background: promoTimeLeft.d === 0 ? "var(--coral-soft)" : "var(--amber-soft)",
                  border: `1px solid ${promoTimeLeft.d === 0 ? "rgba(224,36,36,0.2)" : "rgba(217,119,6,0.2)"}`,
                  borderRadius: 8,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <div>
                    <h5 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: promoTimeLeft.d === 0 ? "var(--coral)" : "#b45309" }}>
                      {promoTimeLeft.d === 0 ? "Promotion Expiring Soon!" : "Promotional Plan Active"}
                    </h5>
                    <p style={{ margin: "4px 0 0 0", fontSize: 13, color: promoTimeLeft.d === 0 ? "var(--coral)" : "#b45309", opacity: 0.9 }}>
                      {promoTimeLeft.d === 0 
                        ? `Your promotional access expires in ${promoTimeLeft.h} hours.` 
                        : `You have ${promoTimeLeft.d} days and ${promoTimeLeft.h} hours remaining.`}
                      <br/>Upgrade to a paid plan to ensure uninterrupted access to your features.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      // Scroll to Available Plans Switcher
                      document.getElementById("available-plans")?.scrollIntoView({ behavior: "smooth" })
                    }}
                    style={{
                      background: promoTimeLeft.d === 0 ? "var(--coral)" : "var(--amber)",
                      color: "#fff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: 6,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: 13
                    }}
                  >
                    Upgrade Now
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div style={{ background: "var(--paper-raised)", padding: "16px 20px", borderRadius: 8, border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Doctor / Staff Quota</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2, color: "var(--ink)" }}>
                    {planDetails?.doctorLimit ? `Up to ${planDetails.doctorLimit} doctor${planDetails.doctorLimit > 1 ? "s" : ""}` : "Unlimited doctors"}
                  </div>
                </div>
                <div style={{ background: "var(--paper-raised)", padding: "16px 20px", borderRadius: 8, border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Patient Records Quota</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2, color: "var(--ink)" }}>
                    {planDetails?.patientLimit ? `Up to ${planDetails.patientLimit} patients` : "Unlimited patients"}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--ink)" }}>
                Active Plan Features:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                {(planDetails?.activeFeatures || []).map((featKey: string) => {
                  const label = featKey.split(".")[1]?.replace(/_/g, " ") || featKey
                  return (
                    <div key={featKey} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ink)" }}>
                      <Check size={14} color="var(--forest)" />
                      <span style={{ textTransform: "capitalize" }}>{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Available Plans Switcher */}
          <div id="available-plans" className="bg-white border border-line rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-6 py-5 border-b border-line bg-paper-raised">
              <h3 className="text-[17px] font-bold m-0 text-ink">Available Plans & Upgrades</h3>
              <p className="text-[13px] text-ink-soft mt-1 mb-0">Select a plan to change your features and limits. Changes take effect immediately.</p>
            </div>
            <div className="p-6">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {allPlans.map((plan: any) => {
                  const isCurrent = plan.name.toLowerCase() === (planDetails?.planName || "").toLowerCase()
                  const price = isIndia 
                    ? `₹${plan.priceMonthlyInr?.toLocaleString("en-IN") || 0}/mo`
                    : `$${plan.priceMonthlyUsd || 0}/mo`

                  const includedFeatures = plan.planFeatures
                    ?.filter((pf: any) => pf.included)
                    ?.map((pf: any) => pf.feature.name) || []

                  return (
                    <div 
                      key={plan.id}
                      style={{
                        background: isCurrent ? "var(--paper-raised)" : "var(--paper)",
                        border: isCurrent ? "2px solid var(--forest)" : "1px solid var(--line)",
                        borderRadius: 10,
                        padding: "16px 20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 16 }}>{plan.name}</span>
                            {plan.isFeatured && (
                              <span style={{ background: "var(--amber-soft)", color: "var(--amber)", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>
                                POPULAR
                              </span>
                            )}
                            {isCurrent && (
                              <span style={{ background: "var(--forest)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>
                                CURRENT PLAN
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>
                            {plan.doctorLimit ? `${plan.doctorLimit} doctor` : "Unlimited doctors"} · {plan.patientLimit ? `${plan.patientLimit} patients` : "Unlimited patients"}
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{price}</div>
                          {isCurrent ? (
                            <button className="cw-btn cw-btn-ghost cw-btn-sm" disabled style={{ marginTop: 6, opacity: 0.8 }}>
                              Active
                            </button>
                          ) : (
                            <button 
                              className="cw-btn cw-btn-primary cw-btn-sm" 
                              onClick={() => handlePlanSwitch(plan.id)}
                              disabled={isPending}
                              style={{ marginTop: 6 }}
                            >
                              Switch to {plan.name}
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {includedFeatures.map((fn: string) => (
                          <span key={fn} style={{ fontSize: 11.5, background: "rgba(0,0,0,0.03)", padding: "2px 8px", borderRadius: 4, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 4 }}>
                            <Check size={11} color="var(--forest)" /> {fn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "billing" && (
        <div className="bg-white border border-line rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-5 border-b border-line bg-paper-raised">
            <h3 className="text-[17px] font-bold m-0 text-ink">Billing & Compliance</h3>
            <p className="text-[13px] text-ink-soft mt-1 mb-0">Configure your localization, tax compliance, and invoice details.</p>
          </div>
          <div className="p-6 flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="cw-field !mb-0">
                <label>Country</label>
                <select className="cw-select" value={billing.country} onChange={e => setBilling({ ...billing, country: e.target.value })} disabled={isPending}>
                  <option value="US">🇺🇸 United States</option>
                  <option value="CA">🇨🇦 Canada</option>
                  <option value="AE">🇦🇪 United Arab Emirates</option>
                  <option value="IN">🇮🇳 India</option>
                  <option value="ZA">🇿🇦 South Africa</option>
                  <option value="NG">🇳🇬 Nigeria</option>
                  <option value="KE">🇰🇪 Kenya</option>
                  <option value="Other">🌍 Other / International</option>
                </select>
              </div>
              
              <div className="cw-field !mb-0">
                <label>UPI ID / Virtual Payment Address</label>
                <input className="cw-input" value={billing.config.upiId || ""} onChange={e => setBilling({ ...billing, config: { ...billing.config, upiId: e.target.value } })} disabled={isPending} />
              </div>
            </div>
            
            <div className="cw-field">
              <label>Invoice Logo</label>
              <div className="flex items-center gap-4">
                <input type="file" className="cw-input flex-1" onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  
                  try {
                    const formData = new FormData()
                    formData.append("file", file)
                    const res = await fetch("/api/upload", { method: "POST", body: formData })
                    if (!res.ok) throw new Error("Upload failed")
                    const json = await res.json()
                    setBilling({ ...billing, config: { ...billing.config, invoiceLogo: json.url } })
                  } catch {
                    showAlert({ title: "Upload Failed", body: "Failed to upload logo", tone: "danger" })
                  }
                }} disabled={isPending} accept="image/*" />
                {billing.config.invoiceLogo && (
                  <div className="bg-paper border border-line rounded p-2">
                    <img src={billing.config.invoiceLogo} alt="Invoice Logo" style={{ maxHeight: 36, objectFit: "contain" }} />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="cw-field !mb-0">
                <label>SAC Code</label>
                <input className="cw-input" value={billing.config.sacCode || ""} onChange={e => setBilling({ ...billing, config: { ...billing.config, sacCode: e.target.value } })} disabled={isPending} />
              </div>
              <div className="cw-field !mb-0">
                <label>HSN Code</label>
                <input className="cw-input" value={billing.config.hsnCode || ""} onChange={e => setBilling({ ...billing, config: { ...billing.config, hsnCode: e.target.value } })} disabled={isPending} />
              </div>
            </div>

            {billing.country === "US" && (
              <div className="p-4 border border-line rounded-lg bg-paper-raised space-y-4 mb-4">
                <div className="cw-field">
                  <label>EIN (Employer Identification Number)</label>
                  <input className="cw-input" value={billing.config.ein || ""} onChange={e => setBilling({ ...billing, config: { ...billing.config, ein: e.target.value } })} disabled={isPending} />
                </div>
                <div className="cw-field">
                  <label>NPI Type 2</label>
                  <input className="cw-input" value={billing.config.npi || ""} onChange={e => setBilling({ ...billing, config: { ...billing.config, npi: e.target.value } })} disabled={isPending} />
                </div>
                <div className="cw-field">
                  <label>Taxonomy Code</label>
                  <input className="cw-input" value={billing.config.taxonomyCode || ""} onChange={e => setBilling({ ...billing, config: { ...billing.config, taxonomyCode: e.target.value } })} disabled={isPending} />
                </div>
              </div>
            )}

            {billing.country === "IN" && (
              <div className="p-4 border border-line rounded-lg bg-paper-raised space-y-4 mb-4">
                <div className="cw-field">
                  <label>GSTIN</label>
                  <input className="cw-input" value={billing.config.gstin || ""} onChange={e => setBilling({ ...billing, config: { ...billing.config, gstin: e.target.value } })} disabled={isPending} />
                </div>
                <div className="cw-field">
                  <label>PAN</label>
                  <input className="cw-input" value={billing.config.pan || ""} onChange={e => setBilling({ ...billing, config: { ...billing.config, pan: e.target.value } })} disabled={isPending} />
                </div>
              </div>
            )}

            {billing.country === "AE" && (
              <div className="p-4 border border-line rounded-lg bg-paper-raised space-y-4 mb-4">
                <div className="cw-field">
                  <label>TRN</label>
                  <input className="cw-input" value={billing.config.trn || ""} onChange={e => setBilling({ ...billing, config: { ...billing.config, trn: e.target.value } })} disabled={isPending} />
                </div>
                <div className="cw-field">
                  <label>DHA / MOHAP Facility License</label>
                  <input className="cw-input" value={billing.config.dhaLicense || ""} onChange={e => setBilling({ ...billing, config: { ...billing.config, dhaLicense: e.target.value } })} disabled={isPending} />
                </div>
              </div>
            )}

            {billing.country === "CA" && (
              <div className="p-4 border border-line rounded-lg bg-paper-raised space-y-4 mb-4">
                <div className="cw-field">
                  <label>CRA Business Number</label>
                  <input className="cw-input" value={billing.config.cra || ""} onChange={e => setBilling({ ...billing, config: { ...billing.config, cra: e.target.value } })} disabled={isPending} />
                </div>
              </div>
            )}

            {["ZA", "NG", "KE"].includes(billing.country) && (
              <div className="p-4 border border-line rounded-lg bg-paper-raised space-y-4 mb-4">
                <div className="cw-field">
                  <label>Facility Registration Number</label>
                  <input className="cw-input" value={billing.config.medicalBoardReg || ""} onChange={e => setBilling({ ...billing, config: { ...billing.config, medicalBoardReg: e.target.value } })} disabled={isPending} />
                </div>
                <div className="cw-field">
                  <label>Tax Identification Number (TIN)</label>
                  <input className="cw-input" value={billing.config.tin || ""} onChange={e => setBilling({ ...billing, config: { ...billing.config, tin: e.target.value } })} disabled={isPending} />
                </div>
              </div>
            )}

          </div>
          <div className="px-6 py-4 bg-paper-raised/50 border-t border-line flex justify-end">
            <button className="cw-btn cw-btn-primary" onClick={handleBillingSave} disabled={isPending}>Save changes</button>
          </div>
        </div>
      )}

      {tab === "account" && (
        <div className="bg-white border border-line rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-5 border-b border-line bg-paper-raised">
            <h3 className="text-[17px] font-bold m-0 text-ink">Your account</h3>
            <p className="text-[13px] text-ink-soft mt-1 mb-0">Update your personal login details and download your data.</p>
          </div>
          <div className="p-6 flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="cw-field !mb-0"><label>Name</label><input className="cw-input" value={user.name} onChange={e => setUser({ ...user, name: e.target.value })} disabled={isPending} /></div>
              <div className="cw-field !mb-0"><label>Email</label><input className="cw-input" type="email" value={user.email} onChange={e => setUser({ ...user, email: e.target.value })} disabled={isPending} /></div>
            </div>
            <div className="cw-field"><label>New password</label><input className="cw-input" type="password" placeholder="Leave blank to keep current password" value={user.password} onChange={e => setUser({ ...user, password: e.target.value })} disabled={isPending} /></div>
            
            <div className="pt-2">
              <button className="cw-btn cw-btn-primary" onClick={handleUserSave} disabled={isPending}>Save changes</button>
            </div>
            
            <hr className="cw-rule" style={{ margin: "22px 0" }} />
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1, paddingRight: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  Export clinic data
                  {!planDetails?.activeFeatures?.includes("support.data_export") && (
                    <span style={{ fontSize: 11, background: "var(--amber-soft)", color: "var(--amber)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                      Clinic Group
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>
                  Download all clinic patients, appointments and invoices as CSV.
                </div>
                {exportMessage && (
                  <div style={{ fontSize: 12, color: "var(--forest)", marginTop: 4, fontWeight: 600 }}>
                    ✓ {exportMessage}
                  </div>
                )}
              </div>
              
              {planDetails?.activeFeatures?.includes("support.data_export") ? (
                <button 
                  className="cw-btn cw-btn-ghost cw-btn-sm" 
                  onClick={handleOpenExport} 
                  disabled={isPending || isExportLoading}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Download size={13} /> {isExportLoading ? "Preparing..." : "Export Data"}
                </button>
              ) : (
                <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={() => setTab("subscription")} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Lock size={12} /> Upgrade to Export
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "notifs" && (
        <div className="bg-white border border-line rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-5 border-b border-line bg-paper-raised">
            <h3 className="text-[17px] font-bold m-0 text-ink">Notification preferences</h3>
            <p className="text-[13px] text-ink-soft mt-1 mb-0">Control when and how you receive alerts and summaries.</p>
          </div>
          <div className="p-6 flex flex-col gap-5">
            {[
              { 
                key: "appointmentReminders", 
                label: "Appointment reminders", 
                desc: "Get notified an hour before each scheduled visit.",
                reqFeature: "communication.reminders" 
              },
              { 
                key: "dailySummary", 
                label: "Daily summary", 
                desc: "A morning email with the day's full schedule.",
                reqFeature: null 
              },
              { 
                key: "invoiceAlerts", 
                label: "Invoice alerts", 
                desc: "Get notified when an invoice is marked unpaid for 7+ days.",
                reqFeature: "billing.invoices" 
              },
            ].map((n: any) => {
              const isLocked = n.reqFeature && !planDetails?.activeFeatures?.includes(n.reqFeature)
              return (
                <div key={n.key} className="cw-list-row" style={{ alignItems: "flex-start", opacity: isLocked ? 0.6 : 1 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                      {n.label}
                      {isLocked && (
                        <span style={{ fontSize: 10.5, background: "var(--line)", color: "var(--ink-soft)", padding: "1px 6px", borderRadius: 4 }}>
                          Plan upgrade required
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{n.desc}</div>
                  </div>
                  <button
                    disabled={isLocked}
                    onClick={() => setNotifs({ ...notifs, [n.key]: !(notifs as any)[n.key] })}
                    style={{ width: 40, height: 22, borderRadius: 20, border: "none", background: (notifs as any)[n.key] ? "#1E4638" : "#DAD6C9", position: "relative", flexShrink: 0, cursor: isLocked ? "not-allowed" : "pointer" }}
                  >
                    <span style={{ position: "absolute", top: 2, left: (notifs as any)[n.key] ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s ease" }} />
                  </button>
                </div>
              )
            })}
            </div>
          <div className="px-6 py-4 bg-paper-raised/50 border-t border-line flex justify-end">
            <button className="cw-btn cw-btn-primary" onClick={handleNotifsSave} disabled={isPending}>Save changes</button>
          </div>
        </div>
      )}

      {tab === "developer" && (() => {
        const hasOnlineBooking = planDetails?.activeFeatures?.includes("scheduling.online_booking")
        const bookingUrl = typeof window !== "undefined"
          ? `${window.location.origin}/book/${initialClinic?.slug}`
          : `/book/${initialClinic?.slug}`
        
        const embedSnippet = `<!-- OpenORDO Booking Widget -->
<iframe
  src="${bookingUrl}?embed=1"
  width="100%"
  height="720"
  frameborder="0"
  style="border-radius:12px;border:1px solid #DAD6C9;"
></iframe>`

        const apiSnippet = `curl -X POST https://yourdomain.com/api/book/v1 \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey || "YOUR_API_KEY"}" \\
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+91 9876543210",
    "date": "2024-12-20",
    "time": "10:00",
    "reason": "General checkup"
  }'`

        function copyToClipboard(text: string) {
          navigator.clipboard.writeText(text).then(() => showAlert({ title: "Copied", body: "Copied to clipboard", tone: "primary" }))
        }

        async function handleGenerate() {
          const ok = await confirm({ title: "Regenerate API Key?", body: "Generating a new API key will invalidate any existing key. Are you sure you want to proceed?", tone: "danger" })
          if (!ok) return
          startTransition(async () => {
            try {
              const result = await generateApiKeyAction()
              setApiKey(result.apiKey)
              setNewlyGeneratedApiKey(result.apiKey)
            } catch {
              showAlert({ title: "Generation Failed", body: "Failed to generate API key", tone: "danger" })
            }
          })
        }

        async function handleDeleteKey() {
          const ok = await confirm({ title: "Delete API Key?", body: "Are you sure you want to delete this API key? Applications using it will immediately lose access.", tone: "danger" })
          if (!ok) return
          startTransition(async () => {
            try {
              await deleteApiKeyAction()
              setApiKey("")
              setNewlyGeneratedApiKey(null)
            } catch {
              showAlert({ title: "Deletion Failed", body: "Failed to delete API key", tone: "danger" })
            }
          })
        }

        function handleDownloadKey() {
          if (!newlyGeneratedApiKey) return
          const blob = new Blob([newlyGeneratedApiKey], { type: "text/plain" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = "OpenORDO_api_key.txt"
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Public Booking Link */}
            <div className="bg-white border border-line rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-6 py-5 border-b border-line bg-paper-raised flex justify-between items-center">
                <div>
                  <h3 className="text-[17px] font-bold m-0 text-ink">Public Booking Link</h3>
                  <p className="text-[13px] text-ink-soft mt-1 mb-0">Share this link with patients to book online.</p>
                </div>
                {hasOnlineBooking && (
                  <a href={bookingUrl} target="_blank" rel="noreferrer" className="cw-btn cw-btn-ghost cw-btn-sm">
                    <ExternalLink size={13} /> Open Link
                  </a>
                )}
              </div>
              <div className="p-6 flex flex-col gap-4">
                {hasOnlineBooking ? (
                  <>
                    <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: "0 0 12px" }}>
                      Share this link with patients so they can book appointments directly — no login required.
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="cw-input"
                        readOnly
                        value={bookingUrl}
                        style={{ flex: 1, fontSize: 13, color: "var(--moss)", fontFamily: "monospace" }}
                      />
                      <button
                        className="cw-btn cw-btn-ghost cw-btn-sm"
                        onClick={() => copyToClipboard(bookingUrl)}
                      >
                        <Copy size={13} /> Copy
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--amber-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                      <Lock size={18} color="var(--amber)" />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Online Booking Page Locked</div>
                    <p style={{ fontSize: 12.5, color: "var(--ink-soft)", maxWidth: 320, margin: "4px auto 14px" }}>
                      Online self-booking pages for patients are included in Practice and Clinic Group plans.
                    </p>
                    <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={() => setTab("subscription")}>
                      Upgrade to Activate Booking Link
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* API Key */}
            <div className="bg-white border border-line rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-6 py-5 border-b border-line bg-paper-raised">
                <h3 className="text-[17px] font-bold m-0 text-ink">API Key</h3>
                <p className="text-[13px] text-ink-soft mt-1 mb-0">Use this secret key to authenticate API requests.</p>
              </div>
              <div className="p-6 flex flex-col gap-4">
                {newlyGeneratedApiKey ? (
                  <div style={{ background: "var(--success-soft)", border: "1px solid var(--success)", padding: "16px", borderRadius: "8px" }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: "bold", color: "var(--success)" }}>API Key Generated</h4>
                    <p style={{ fontSize: "13px", color: "var(--success)", margin: "0 0 16px", lineHeight: "1.5" }}>
                      Please copy this key and keep it safe. For security reasons, <strong>it will not be shown again</strong>.
                    </p>
                    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                      <input
                        className="cw-input"
                        readOnly
                        type="text"
                        value={newlyGeneratedApiKey}
                        style={{ flex: 1, fontSize: 13, fontFamily: "monospace", borderColor: "var(--success)" }}
                      />
                      <button className="cw-btn cw-btn-ghost cw-btn-sm" onClick={() => copyToClipboard(newlyGeneratedApiKey)} style={{ color: "var(--success)" }}>
                        <Copy size={13} /> Copy
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={handleDownloadKey} style={{ background: "var(--success)" }}>
                        <Download size={13} /> Download .txt
                      </button>
                      <button className="cw-btn cw-btn-ghost cw-btn-sm" onClick={() => setNewlyGeneratedApiKey(null)} style={{ color: "var(--success)" }}>
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: "0 0 12px" }}>
                      Use this secret key to authenticate API requests. Keep it safe — treat it like a password.
                    </p>
                    {apiKey ? (
                      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                        <input
                          className="cw-input"
                          readOnly
                          type="text"
                          value={`************************************${apiKey.substring(apiKey.length - 4)}`}
                          style={{ flex: 1, fontSize: 13, fontFamily: "monospace", color: "var(--ink-soft)" }}
                        />
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 12 }}>No API key generated yet.</p>
                    )}
                    
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={handleGenerate} disabled={isPending}>
                        <RefreshCw size={13} /> {apiKey ? "Regenerate key" : "Generate key"}
                      </button>
                      {apiKey && (
                        <button className="cw-btn cw-btn-ghost cw-btn-sm" onClick={handleDeleteKey} disabled={isPending} style={{ color: "var(--coral)" }}>
                          Delete key
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Embed Code */}
            {hasOnlineBooking && (
              <div className="bg-white border border-line rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="px-6 py-5 border-b border-line bg-paper-raised flex justify-between items-center">
                  <div>
                    <h3 className="text-[17px] font-bold m-0 text-ink">Embed Widget</h3>
                    <p className="text-[13px] text-ink-soft mt-1 mb-0">Embed your booking form as an iframe.</p>
                  </div>
                  <button className="cw-btn cw-btn-ghost cw-btn-sm" onClick={() => copyToClipboard(embedSnippet)}>
                    <Copy size={13} /> Copy code
                  </button>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: "0 0 12px" }}>
                    Paste this into any website to embed your booking form as an iframe widget.
                  </p>
                  <pre style={{
                    background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8,
                    padding: "14px 16px", fontSize: 12, overflowX: "auto", whiteSpace: "pre-wrap",
                    fontFamily: "monospace", color: "var(--ink)", margin: 0
                  }}>{embedSnippet}</pre>
                </div>
              </div>
            )}
          </div>
        )
      })()}
      </main>

      {/* Export Clinic Data Modal */}
      {exportModalOpen && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setExportModalOpen(false)
          }}
        >
          <div 
            style={{
              background: "var(--paper-raised, #ffffff)",
              border: "1px solid var(--line, #e2e8f0)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 520,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              overflow: "hidden"
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: "18px 22px",
              borderBottom: "1px solid var(--line, #e2e8f0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Download size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ink, #0f172a)" }}>
                    Export Clinic Data
                  </h3>
                  <div style={{ fontSize: 12, color: "var(--ink-soft, #64748b)" }}>
                    Select specific datasets or download all clinic records as CSV
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setExportModalOpen(false)}
                className="cw-btn cw-btn-ghost cw-btn-icon"
                style={{ borderRadius: "50%", padding: 6 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Date Range Options */}
            <div style={{
              padding: "14px 22px 14px",
              background: "var(--paper, #f8fafc)",
              borderBottom: "1px solid var(--line, #e2e8f0)"
            }}>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ink-soft, #64748b)",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <span>Date Range</span>
                {exportData && (
                  <span style={{ fontWeight: 600, color: "var(--forest, #059669)", fontSize: 11.5 }}>
                    {exportData.range === "all" 
                      ? "All recorded clinic data" 
                      : exportData.startDateStr && exportData.endDateStr 
                        ? `${exportData.startDateStr} → ${exportData.endDateStr}` 
                        : ""}
                  </span>
                )}
              </div>

              {/* Range Pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[
                  { key: "1m", label: "1 Month" },
                  { key: "3m", label: "3 Months" },
                  { key: "6m", label: "6 Months" },
                  { key: "1y", label: "1 Year" },
                  { key: "all", label: "All Time" },
                  { key: "custom", label: "Custom Range" },
                ].map(opt => {
                  const isActive = exportRange === opt.key
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleSelectRange(opt.key as any)}
                      disabled={isExportLoading}
                      style={{
                        padding: "5px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 20,
                        border: "1px solid",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        backgroundColor: isActive ? "var(--forest, #1e4638)" : "var(--paper-raised, #ffffff)",
                        color: isActive ? "#ffffff" : "var(--ink, #0f172a)",
                        borderColor: isActive ? "var(--forest, #1e4638)" : "var(--line, #e2e8f0)",
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>

              {/* Custom Date Pickers */}
              {exportRange === "custom" && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 10,
                  padding: "10px 12px",
                  background: "var(--paper-raised, #ffffff)",
                  border: "1px solid var(--line, #e2e8f0)",
                  borderRadius: 8
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                    <label style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-soft)" }}>From</label>
                    <input
                      type="date"
                      className="cw-input"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      style={{ height: 32, fontSize: 12, padding: "2px 8px" }}
                      disabled={isExportLoading}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                    <label style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-soft)" }}>To</label>
                    <input
                      type="date"
                      className="cw-input"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      style={{ height: 32, fontSize: 12, padding: "2px 8px" }}
                      disabled={isExportLoading}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <button
                      type="button"
                      className="cw-btn cw-btn-primary cw-btn-sm"
                      onClick={handleApplyCustomRange}
                      disabled={isExportLoading}
                      style={{ height: 32, fontSize: 12, marginTop: 16 }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div style={{ padding: "18px 22px" }}>
              {isExportLoading ? (
                <div style={{ padding: "36px 0", textAlign: "center", color: "var(--ink-soft)" }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 12px", opacity: 0.7 }} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                    Filtering clinic data ({exportRange === "custom" ? "Custom Range" : exportRange.toUpperCase()})...
                  </p>
                </div>
              ) : exportData ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Patients */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--line, #e2e8f0)",
                    background: "var(--paper, #f8fafc)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        backgroundColor: "#e0e7ff",
                        color: "#4338ca",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <Users size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>Patients Roster</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
                          {exportData.counts?.patients || 0} patient records (Demographics, contact info)
                        </div>
                      </div>
                    </div>
                    <button
                      className="cw-btn cw-btn-ghost cw-btn-sm"
                      onClick={() => {
                        const suffix = getFilenameSuffix()
                        downloadCSV(exportData.patientsCSV, `${exportData.clinicSlug}_patients_${suffix}.csv`)
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}
                    >
                      <Download size={13} /> CSV
                    </button>
                  </div>

                  {/* Appointments */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--line, #e2e8f0)",
                    background: "var(--paper, #f8fafc)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        backgroundColor: "#ecfdf5",
                        color: "#047857",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <Calendar size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>Appointments</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
                          {exportData.counts?.appointments || 0} appointment records (Visits, doctors, statuses)
                        </div>
                      </div>
                    </div>
                    <button
                      className="cw-btn cw-btn-ghost cw-btn-sm"
                      onClick={() => {
                        const suffix = getFilenameSuffix()
                        downloadCSV(exportData.appointmentsCSV, `${exportData.clinicSlug}_appointments_${suffix}.csv`)
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}
                    >
                      <Download size={13} /> CSV
                    </button>
                  </div>

                  {/* Invoices */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--line, #e2e8f0)",
                    background: "var(--paper, #f8fafc)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        backgroundColor: "#fef3c7",
                        color: "#b45309",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <Receipt size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>Invoices & Billing</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
                          {exportData.counts?.invoices || 0} invoice records (Amounts, statuses, dates)
                        </div>
                      </div>
                    </div>
                    <button
                      className="cw-btn cw-btn-ghost cw-btn-sm"
                      onClick={() => {
                        const suffix = getFilenameSuffix()
                        downloadCSV(exportData.invoicesCSV, `${exportData.clinicSlug}_invoices_${suffix}.csv`)
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}
                    >
                      <Download size={13} /> CSV
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "var(--ink-soft)", padding: 20 }}>
                  No export data available.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "14px 22px",
              borderTop: "1px solid var(--line, #e2e8f0)",
              background: "var(--paper, #f8fafc)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <button
                type="button"
                className="cw-btn cw-btn-ghost cw-btn-sm"
                onClick={() => setExportModalOpen(false)}
              >
                Close
              </button>

              {exportData && (
                <button
                  type="button"
                  className="cw-btn cw-btn-primary cw-btn-sm"
                  onClick={handleDownloadAll}
                  disabled={isExportLoading}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Download size={14} /> Download All (3 Files)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

