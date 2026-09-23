"use client"

import React, { useState, useTransition, useEffect, useRef } from "react"
import { 
  updateClinicSettingsAction, 
  updateUserSettingsAction, 
  updateBillingSettingsAction, 
  generateApiKeyAction,
  deleteApiKeyAction,
  changeClinicPlanAction,
  exportClinicDataAction,
  cancelSubscriptionAction
} from "@/server/actions/settings"
import { saveBookingPageConfig } from "@/server/actions/bookingPageConfig"
import { Copy, RefreshCw, Eye, EyeOff, ExternalLink, Lock, Check, ArrowUpRight, Sparkles, Download, Calendar, Receipt, Users, X, FileText, Palette, Globe, Plus, Trash2, ImagePlus } from "lucide-react"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { toast } from "sonner"
import { StorageTab } from "./StorageTab"

export function SettingsClient({ 
  initialClinic, 
  initialUser,
  planDetails,
  allPlans = [],
  initialTab = "clinic",
  hasBrandedBooking = false,
  initialBookingConfig = null,
  doctors = [],
}: any) {
  const { confirm, showAlert } = useConfirm()
  const [tab, setTab] = useState(initialTab === "booking" ? "developer" : initialTab)

  function handleTabChange(newTab: string) {
    setTab(newTab)
    window.history.replaceState(null, "", `?tab=${newTab}`)
  }
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


  // ── Booking Page Config State ────────────────────────────────────────────
  const parseJsonSafe = (str: string | null | undefined, fallback: any) => {
    try { return str ? JSON.parse(str) : fallback } catch { return fallback }
  }
  const [bpc, setBpc] = useState(() => ({
    logoUrl:          initialBookingConfig?.logoUrl ?? "",
    faviconUrl:       initialBookingConfig?.faviconUrl ?? "",
    coverUrl:         initialBookingConfig?.coverUrl ?? "",
    accentColor:      initialBookingConfig?.accentColor ?? "#1E4638",
    displayName:      initialBookingConfig?.displayName ?? "",
    tagline:          initialBookingConfig?.tagline ?? "",
    aboutText:        initialBookingConfig?.aboutText ?? "",
    showAddress:      initialBookingConfig?.showAddress ?? true,
    showPhone:        initialBookingConfig?.showPhone ?? true,
    showHours:        initialBookingConfig?.showHours ?? true,
    bookableDoctorIds: parseJsonSafe(initialBookingConfig?.bookableDoctorIds, doctors.map((d: any) => d.id)) as string[],
    appointmentTypes:  parseJsonSafe(initialBookingConfig?.appointmentTypes, ["General Checkup", "Follow-up", "New Patient Visit", "Urgent Care"]) as string[],
    showPoweredBy:    initialBookingConfig?.showPoweredBy ?? true,
    socialLinks:      parseJsonSafe(initialBookingConfig?.socialLinks, { website: "", instagram: "", facebook: "", twitter: "" }),
  }))
  const [isBpcSaving, setIsBpcSaving] = useState(false)
  const [newApptType, setNewApptType] = useState("")

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
    const prefix = exportData.clinicSlug || "clinic"
    
    let query = `?range=${exportRange}`
    if (exportRange === "custom" && customStart && customEnd) {
      query += `&startDate=${customStart}&endDate=${customEnd}`
    }
    const zipUrl = `/api/export/all${query}`
    
    const a = document.createElement("a")
    a.href = zipUrl
    a.download = `${prefix}_complete_export.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    setExportMessage(`Full clinic data ZIP is preparing and will download shortly...`)
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
        const plan = allPlans.find((p: any) => p.id === planId)
        if (!plan) throw new Error("Plan not found")
        
        // If it's a free plan (0 price), just change it locally
        if ((plan.priceMonthlyUsd || 0) === 0 && (plan.priceMonthlyInr || 0) === 0) {
          await changeClinicPlanAction(planId)
          await showAlert({ title: "Plan Updated", body: `Switched to ${plan.name} plan successfully!`, tone: "primary" })
          window.location.reload()
          return
        }
        
        const plan_id = plan.razorpayPlanIdMonthly || plan.razorpayPlanIdYearly
        
        const res = await fetch("/api/razorpay/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "PLAN",
            itemId: plan.id,
            planId: plan_id
          })
        })
        
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Failed to create subscription")
        
        if (json.isUpdate) {
          showAlert({ title: "Success", body: "Plan updated! You will be charged the prorated difference on your next invoice.", tone: "primary" })
          setTimeout(() => window.location.reload(), 2000)
          return
        }
        
        if (json.bypass) {
          const verifyRes = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: "bypass_payment",
              razorpay_subscription_id: "bypass_sub",
              razorpay_signature: "bypass_sig",
              type: "PLAN",
              itemId: plan.id,
              isOneTime: false
            })
          })
          if (verifyRes.ok) {
            showAlert({ title: "Success", body: "Payment simulated successfully! (Developer Bypass)", tone: "primary" })
            setTimeout(() => window.location.reload(), 1500)
          } else {
            showAlert({ title: "Verification Failed", body: "Bypass provisioning failed", tone: "danger" })
          }
          return
        }

        if (json.id) {
          const options = {
            key: json.keyId,
            subscription_id: json.id,
            name: "OpenORDO",
            description: `Subscription for ${plan.name} Plan`,
            handler: async function (response: any) {
              try {
                const verifyRes = await fetch("/api/razorpay/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...response,
                    type: "PLAN",
                    itemId: plan.id,
                    isOneTime: false
                  })
                })
                const verifyJson = await verifyRes.json()
                if (!verifyRes.ok) throw new Error(verifyJson.error)
                showAlert({ title: "Success", body: "Payment successful! Your plan is activated.", tone: "primary" })
                setTimeout(() => window.location.reload(), 2000)
              } catch (err: any) {
                showAlert({ title: "Verification Failed", body: err.message || "Payment verification failed", tone: "danger" })
              }
            },
            theme: { color: "#006240" }
          };
          const rzp = new (window as any).Razorpay(options)
          rzp.open()
        } else {
          window.location.reload()
        }
      } catch (err: any) {
        showAlert({ title: "Checkout Error", body: err.message || "Failed to initiate checkout", tone: "danger" })
      }
    })
  }

  async function handleCancelSubscription() {
    const ok = await confirm({
      title: "Cancel Subscription?",
      body: "Your access will remain fully active until the end of your current billing period. After that, your account will be locked for 30 days before data deletion. Autopay will be disabled and your billing details removed.",
      tone: "danger"
    })
    if (!ok) return

    startTransition(async () => {
      try {
        await cancelSubscriptionAction()
        await showAlert({ title: "Subscription Cancelled", body: "Your subscription has been cancelled. You'll retain access until your current period ends.", tone: "primary" })
        window.location.reload()
      } catch (err: any) {
        showAlert({ title: "Error", body: err.message || "Failed to cancel subscription", tone: "danger" })
      }
    })
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {initialClinic.status === "LOCKED_CANCELLED" && (
        <div className="bg-coral-soft border border-coral/30 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-coral font-bold mt-0.5">!</span>
            <div>
              <h4 className="text-[15px] font-bold text-coral m-0">Account Locked</h4>
              <p className="text-[13.5px] text-coral/90 mt-1 mb-0 leading-relaxed">
                Your subscription has ended and your account is locked. Your data will be safely kept for <strong>30 days</strong> from the cancellation date before being automatically deleted. 
                You can still access this page to export your data or renew your subscription.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      <aside className="w-full lg:w-[220px] flex-shrink-0 sticky top-[64px] lg:top-24 lg:self-start z-10 bg-paper py-3 -mx-4 px-4 lg:mx-0 lg:px-0 lg:py-0 border-b border-line lg:border-none overflow-x-auto no-scrollbar">
        <nav className="flex flex-row lg:flex-col gap-2 min-w-max">
          <button 
            onClick={() => handleTabChange("clinic")}
            className={`text-left whitespace-nowrap px-3 py-2 rounded-md ${tab === "clinic" ? "bg-paper-raised font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "font-medium text-ink-soft hover:text-ink hover:bg-paper-raised"}`}
          >
            Clinic Profile
          </button>
          <button 
            onClick={() => handleTabChange("subscription")}
            className={`text-left whitespace-nowrap px-3 py-2 rounded-md ${tab === "subscription" ? "bg-paper-raised font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "font-medium text-ink-soft hover:text-ink hover:bg-paper-raised"}`}
          >
            Subscription & Plan
          </button>
          <button 
            onClick={() => handleTabChange("billing")}
            className={`text-left whitespace-nowrap px-3 py-2 rounded-md ${tab === "billing" ? "bg-paper-raised font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "font-medium text-ink-soft hover:text-ink hover:bg-paper-raised"}`}
          >
            Billing & Compliance
          </button>
          <button 
            onClick={() => handleTabChange("account")}
            className={`text-left whitespace-nowrap px-3 py-2 rounded-md ${tab === "account" ? "bg-paper-raised font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "font-medium text-ink-soft hover:text-ink hover:bg-paper-raised"}`}
          >
            Account & Export
          </button>
          <button 
            onClick={() => handleTabChange("storage")}
            className={`text-left whitespace-nowrap px-3 py-2 rounded-md ${tab === "storage" ? "bg-paper-raised font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "font-medium text-ink-soft hover:text-ink hover:bg-paper-raised"}`}
          >
            Storage & Vaults
          </button>
          <button 
            onClick={() => handleTabChange("notifs")}
            className={`text-left whitespace-nowrap px-3 py-2 rounded-md ${tab === "notifs" ? "bg-paper-raised font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "font-medium text-ink-soft hover:text-ink hover:bg-paper-raised"}`}
          >
            Notifications
          </button>
          <button 
            onClick={() => handleTabChange("developer")}
            className={`text-left whitespace-nowrap px-3 py-2 rounded-md ${tab === "developer" ? "bg-paper-raised font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "font-medium text-ink-soft hover:text-ink hover:bg-paper-raised"}`}
          >
            Developer & Booking
          </button>
        </nav>
      </aside>
      
      <main className="flex-1 w-full min-w-0 pt-1">
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
                    {planDetails?.cancelAtPeriodEnd && planDetails.currentPeriodEnd && (
                      <span className="text-coral ml-2">
                        · Cancels on {Intl.DateTimeFormat("en-GB").format(new Date(planDetails.currentPeriodEnd))}
                      </span>
                    )}
                    {!planDetails?.cancelAtPeriodEnd && planDetails?.currentPeriodEnd && !planDetails?.isDefaultFree && (
                      <span className="ml-2">
                        · Renews on {Intl.DateTimeFormat("en-GB").format(new Date(planDetails.currentPeriodEnd))}
                      </span>
                    )}
                    {planDetails?.trialEndsAt && (
                      <span className="text-amber ml-2">
                        · Trial ends on {Intl.DateTimeFormat("en-GB").format(new Date(planDetails.trialEndsAt))}
                      </span>
                    )}
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

                  const catalogFeatures = (plan.planFeatures || [])
                    .filter((pf: any) => pf.feature?.isGloballyEnabled !== false)
                    .map((pf: any) => pf.feature?.name || "")
                    .filter(Boolean)

                  let customBullets: string[] = []
                  try {
                    if (plan.features) {
                      const parsed = JSON.parse(plan.features)
                      if (Array.isArray(parsed)) customBullets = parsed
                    }
                  } catch (e) {}

                  let includedFeatures = [...catalogFeatures, ...customBullets]

                  if (plan.storageLimitGb) {
                    includedFeatures.push(`${plan.storageLimitGb} GB document storage`)
                  }

                  if (includedFeatures.length === 0) {
                    const slug = (plan.slug || plan.name || "").toLowerCase()
                    if (slug.includes("free") || slug.includes("starter")) {
                      includedFeatures = ["Basic patient records", "Appointment calendar"]
                    } else if (slug.includes("practice")) {
                      includedFeatures = ["Multiple doctor accounts", "Online booking page", "Invoicing"]
                    } else {
                      includedFeatures = ["Unlimited doctors", "Revenue analytics", "Data export"]
                    }
                  }

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

              {!planDetails.isDefaultFree && (
                <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px 0" }}>Danger Zone</h4>
                  <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 16px 0" }}>
                    If you cancel your subscription, your account will be locked at the end of the billing cycle. Data will be retained for 30 days before being permanently deleted.
                  </p>
                  <button 
                    onClick={handleCancelSubscription}
                    className="cw-btn cw-btn-ghost cw-btn-sm" 
                    style={{ color: "var(--coral)", border: "1px solid var(--coral)" }}
                    disabled={isPending}
                  >
                    Cancel Subscription
                  </button>
                </div>
              )}
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
      {tab === "storage" && <StorageTab />}

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
                <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={() => handleTabChange("subscription")} style={{ display: "flex", alignItems: "center", gap: 4 }}>
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

        async function handleSaveBpc() {
          setIsBpcSaving(true)
          try {
            await saveBookingPageConfig({
              ...bpc,
              socialLinks: bpc.socialLinks,
            })
            toast.success("Booking page settings saved")
          } catch (err: any) {
            toast.error(err.message || "Failed to save")
          } finally {
            setIsBpcSaving(false)
          }
        }

        async function handleImageUpload(field: "logoUrl" | "faviconUrl" | "coverUrl", file: File) {
          const fd = new FormData()
          fd.append("file", file)
          const res = await fetch("/api/upload", { method: "POST", body: fd })
          if (!res.ok) { toast.error("Upload failed"); return }
          const { url } = await res.json()
          setBpc(prev => ({ ...prev, [field]: url }))
        }

        function ImageUploadField({ label, field, value, hint }: { label: string; field: "logoUrl" | "faviconUrl" | "coverUrl"; value: string; hint?: string }) {
          return (
            <div className="cw-field !mb-0">
              <label>{label}</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {value ? (
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <img src={value} alt={label} style={{ height: field === "coverUrl" ? 60 : 40, width: field === "coverUrl" ? 120 : 40, objectFit: "cover", borderRadius: field === "coverUrl" ? 6 : "50%", border: "1px solid var(--line)" }} />
                    <button
                      type="button"
                      onClick={() => setBpc(prev => ({ ...prev, [field]: "" }))}
                      style={{ position: "absolute", top: -6, right: -6, background: "var(--coral)", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    ><X size={10} /></button>
                  </div>
                ) : null}
                <label style={{ cursor: "pointer" }}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(field, f) }}
                  />
                  <span className="cw-btn cw-btn-ghost cw-btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <ImagePlus size={13} /> {value ? "Change" : "Upload"}
                  </span>
                </label>
                {hint && <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{hint}</span>}
              </div>
            </div>
          )
        }

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── SECTION A: Branded Booking Page Config ── */}
            <div className="bg-white border border-line rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-6 py-5 border-b border-line bg-paper-raised flex justify-between items-start">
                <div>
                  <h3 className="text-[17px] font-bold m-0 text-ink flex items-center gap-2">
                    <Palette size={17} style={{ color: "var(--forest)" }} /> Branded Booking Page
                  </h3>
                  <p className="text-[13px] text-ink-soft mt-1 mb-0">
                    Customise your public booking page — logo, colours, content, and doctor availability.
                  </p>
                </div>
                {hasBrandedBooking && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#2e6b3e", background: "#dceadd", padding: "3px 10px", borderRadius: 20 }}>Active</span>
                )}
              </div>

              {!hasBrandedBooking ? (
                /* Upsell card (amber pattern from CHARTWELL_PLUGINS_SPEC §4.3) */
                <div className="p-6">
                  <div style={{
                    background: "var(--amber-soft)", border: "1px solid var(--amber)",
                    borderRadius: 10, padding: "20px 22px",
                    display: "flex", alignItems: "flex-start", gap: 16
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(200,134,43,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Palette size={20} style={{ color: "var(--amber)" }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14.5, color: "#6B4C15", marginBottom: 4 }}>
                        Branded Booking Page Add-on Required
                      </div>
                      <p style={{ fontSize: 13, color: "#8E6924", margin: "0 0 14px", lineHeight: 1.6 }}>
                        Unlock custom logo, accent colours, welcome text, and per-doctor availability on your public booking page.
                        Your booking link is already live — this add-on lets you brand it.
                      </p>
                      <a href="/dashboard/addons" className="cw-btn cw-btn-sm" style={{ background: "var(--amber)", color: "#fff", border: "none", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <ArrowUpRight size={13} /> View Add-on
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                /* Full config form */
                <div className="p-6 flex flex-col gap-6">

                  {/* Visual Branding */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Visual Branding</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <ImageUploadField label="Clinic Logo" field="logoUrl" value={bpc.logoUrl} hint="Shown top-left on the booking page" />
                      <ImageUploadField label="Favicon" field="faviconUrl" value={bpc.faviconUrl} hint="32×32 browser tab icon" />
                      <div className="md:col-span-2">
                        <ImageUploadField label="Cover / Banner Image" field="coverUrl" value={bpc.coverUrl} hint="Wide banner shown above the booking form (1200×300 recommended)" />
                      </div>
                      <div className="cw-field !mb-0">
                        <label>Accent Colour</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <input
                            type="color"
                            value={bpc.accentColor}
                            onChange={e => setBpc(prev => ({ ...prev, accentColor: e.target.value }))}
                            style={{ width: 44, height: 36, border: "1px solid var(--line)", borderRadius: 7, cursor: "pointer", padding: 2 }}
                          />
                          <input
                            className="cw-input"
                            value={bpc.accentColor}
                            onChange={e => setBpc(prev => ({ ...prev, accentColor: e.target.value }))}
                            placeholder="#1E4638"
                            style={{ width: 110, fontFamily: "monospace", fontSize: 13 }}
                          />
                          <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Used for buttons and highlights</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--line)" }} />

                  {/* Content */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Content</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="cw-field !mb-0">
                        <label>Display Name <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(public-facing)</span></label>
                        <input className="cw-input" value={bpc.displayName} onChange={e => setBpc(prev => ({ ...prev, displayName: e.target.value }))} placeholder={initialClinic?.name || "Your Clinic Name"} />
                      </div>
                      <div className="cw-field !mb-0">
                        <label>Tagline</label>
                        <input className="cw-input" value={bpc.tagline} onChange={e => setBpc(prev => ({ ...prev, tagline: e.target.value }))} placeholder="e.g. Expert care, close to home." />
                      </div>
                      <div className="cw-field !mb-0 md:col-span-2">
                        <label>Welcome / About Text</label>
                        <textarea className="cw-textarea" rows={3} value={bpc.aboutText} onChange={e => setBpc(prev => ({ ...prev, aboutText: e.target.value }))} placeholder="A short welcome message shown to patients before they book…" />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
                      {[
                        { key: "showAddress", label: "Show address" },
                        { key: "showPhone", label: "Show phone number" },
                        { key: "showHours", label: "Show working hours" },
                      ].map(({ key, label }) => (
                        <label key={key} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={(bpc as any)[key]}
                            onChange={e => setBpc(prev => ({ ...prev, [key]: e.target.checked }))}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                      Address, phone, and hours are pulled from your <button className="cw-link" onClick={() => handleTabChange("clinic")}>Clinic Profile</button> — edit them there.
                    </p>
                  </div>

                  <div style={{ borderTop: "1px solid var(--line)" }} />

                  {/* Booking Behaviour */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Booking Behaviour</div>

                    {/* Per-doctor toggles */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>Publicly Bookable Doctors</div>
                      {doctors.length === 0 ? (
                        <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No doctors added yet. <a href="/dashboard/doctors" className="cw-link">Add doctors →</a></p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {doctors.map((d: any) => {
                            const enabled = bpc.bookableDoctorIds.includes(d.id)
                            return (
                              <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8 }}>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{d.name}</div>
                                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{d.specialty}</div>
                                </div>
                                <div
                                  onClick={() => setBpc(prev => ({
                                    ...prev,
                                    bookableDoctorIds: enabled
                                      ? prev.bookableDoctorIds.filter((id: string) => id !== d.id)
                                      : [...prev.bookableDoctorIds, d.id]
                                  }))}
                                  style={{ width: 40, height: 22, borderRadius: 11, cursor: "pointer", background: enabled ? "var(--forest)" : "#d1d5db", position: "relative", transition: "background .15s", flexShrink: 0 }}
                                >
                                  <div style={{ position: "absolute", top: 2, left: enabled ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Appointment types */}
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Appointment Types / Reasons</div>
                      <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10 }}>Patients will pick from this list when booking. Leave empty to show a free-text field instead.</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                        {bpc.appointmentTypes.map((type: string, i: number) => (
                          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 20, fontSize: 13 }}>
                            {type}
                            <button type="button" onClick={() => setBpc(prev => ({ ...prev, appointmentTypes: prev.appointmentTypes.filter((_: string, j: number) => j !== i) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--coral)", padding: 0, display: "flex" }}>
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          className="cw-input"
                          value={newApptType}
                          onChange={e => setNewApptType(e.target.value)}
                          placeholder="e.g. Dental Cleaning"
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              const v = newApptType.trim()
                              if (v && !bpc.appointmentTypes.includes(v)) {
                                setBpc(prev => ({ ...prev, appointmentTypes: [...prev.appointmentTypes, v] }))
                              }
                              setNewApptType("")
                            }
                          }}
                          style={{ maxWidth: 240 }}
                        />
                        <button type="button" className="cw-btn cw-btn-ghost cw-btn-sm" onClick={() => {
                          const v = newApptType.trim()
                          if (v && !bpc.appointmentTypes.includes(v)) setBpc(prev => ({ ...prev, appointmentTypes: [...prev.appointmentTypes, v] }))
                          setNewApptType("")
                        }}><Plus size={13} /> Add</button>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--line)" }} />

                  {/* Footer */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Footer</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: 14 }}>
                      {[
                        { key: "website", icon: <Globe size={14} />, placeholder: "https://yourwebsite.com" },
                        { key: "instagram", icon: <span style={{ fontSize: 14 }}>📸</span>, placeholder: "https://instagram.com/yourhandle" },
                        { key: "facebook", icon: <span style={{ fontSize: 14 }}>📘</span>, placeholder: "https://facebook.com/yourpage" },
                        { key: "twitter", icon: <span style={{ fontSize: 14 }}>🐦</span>, placeholder: "https://x.com/yourhandle" },
                      ].map(({ key, icon, placeholder }) => (
                        <div key={key} className="cw-field !mb-0">
                          <label style={{ display: "flex", alignItems: "center", gap: 5 }}>{icon} {key.charAt(0).toUpperCase() + key.slice(1)}</label>
                          <input
                            className="cw-input"
                            value={(bpc.socialLinks as any)[key] || ""}
                            onChange={e => setBpc(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, [key]: e.target.value } }))}
                            placeholder={placeholder}
                          />
                        </div>
                      ))}
                    </div>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={bpc.showPoweredBy}
                        onChange={e => setBpc(prev => ({ ...prev, showPoweredBy: e.target.checked }))}
                        style={{ marginTop: 3 }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>Show "Powered by OpenORDO" badge</div>
                        <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                          Uncheck to hide the badge from your booking page. Available because you have the Branded Booking add-on.
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Save */}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button className="cw-btn cw-btn-primary" onClick={handleSaveBpc} disabled={isBpcSaving}>
                      {isBpcSaving ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : <><Check size={14} /> Save Booking Page Settings</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── SECTION B: Public Booking Link ── */}
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
                    <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={() => handleTabChange("subscription")}>
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

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", border: "1px solid var(--line, #e2e8f0)", borderRadius: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        backgroundColor: "#fce7f3",
                        color: "#be185d",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <FileText size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>Documents & Files</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
                          {exportData.counts?.documents || 0} document records (Physical files inside ZIP)
                        </div>
                      </div>
                    </div>
                    <button
                      className="cw-btn cw-btn-ghost cw-btn-sm"
                      onClick={() => {
                        const prefix = exportData.clinicSlug || "clinic"
                        let query = `?range=${exportRange}`
                        if (exportRange === "custom" && customStart && customEnd) {
                          query += `&startDate=${customStart}&endDate=${customEnd}`
                        }
                        const zipUrl = `/api/export/documents${query}`
                        
                        const a = document.createElement("a")
                        a.href = zipUrl
                        a.download = `${prefix}_documents.zip`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}
                    >
                      <Download size={13} /> ZIP
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
                  <Download size={14} /> Download All
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

