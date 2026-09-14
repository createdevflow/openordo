"use client"

import React, { useMemo, useState, useEffect } from "react"
import { Users, CalendarClock, TrendingUp, Receipt, Link as LinkIcon, X, Copy, Check, Stethoscope, CheckCircle2, Lock, ArrowUpRight } from "lucide-react"
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { currency, fmtDateShort, fmtTime12, initials, StatusBadge, toISO } from "@/components/DashboardHelpers"
import Link from "next/link"

export function OverviewClient({ clinic, patients, appointments, invoices, doctors, planDetails }: any) {
  const [showPopup, setShowPopup] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isClient, setIsClient] = useState(false)

  const hasOnlineBooking = planDetails?.activeFeatures?.includes("scheduling.online_booking") ?? true
  const hasBilling = planDetails?.activeFeatures?.includes("billing.invoices") ?? true
  const hasRevenueReports = planDetails?.activeFeatures?.includes("billing.revenue_reports") ?? true

  const bookingUrl = typeof window !== 'undefined' ? `${window.location.origin}/book/${clinic?.slug}` : `/book/${clinic?.slug}`
  const clinicAgeHours = clinic?.createdAt ? (new Date().getTime() - new Date(clinic.createdAt).getTime()) / (1000 * 60 * 60) : 100
  const isNewClinic = clinicAgeHours < 24

  useEffect(() => {
    setIsClient(true)
    if (hasOnlineBooking && isNewClinic && clinic?.id) {
      const seen = localStorage.getItem(`sawBookingPopup_${clinic.id}`)
      if (!seen) {
        setShowPopup(true)
      }
    }
  }, [hasOnlineBooking, isNewClinic, clinic?.id])

  const closePopup = () => {
    if (clinic?.id) {
      localStorage.setItem(`sawBookingPopup_${clinic.id}`, "true")
    }
    setShowPopup(false)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch(err) {}
  }

  const today = new Date()
  const isoToday = toISO(today.getFullYear(), today.getMonth(), today.getDate())

  // Ensure parsing for dates and items
  const mappedAppointments = appointments.map((a: any) => ({
    ...a,
    dateString: toISO(new Date(a.date).getFullYear(), new Date(a.date).getMonth(), new Date(a.date).getDate())
  }))
  const mappedInvoices = invoices.map((inv: any) => ({
    ...inv,
    items: typeof inv.items === "string" ? JSON.parse(inv.items) : inv.items || []
  }))

  const todays = mappedAppointments.filter((a: any) => a.dateString === isoToday)
  const completedVisits = mappedAppointments.filter((a: any) => a.status.toLowerCase() === "completed").length
  const revenueThisMonth = mappedInvoices.filter((i: any) => i.status.toLowerCase() === "paid").reduce((s: number, i: any) => s + i.items.reduce((a: number, it: any) => a + Number(it.amount), 0), 0)
  const pendingAmount = mappedInvoices.filter((i: any) => i.status.toLowerCase() === "unpaid").reduce((s: number, i: any) => s + i.items.reduce((a: number, it: any) => a + Number(it.amount), 0), 0)

  const shiftDate = (iso: string, days: number) => {
    const d = new Date(iso + "T00:00:00")
    d.setDate(d.getDate() + days)
    return toISO(d.getFullYear(), d.getMonth(), d.getDate())
  }

  const trend = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const iso = shiftDate(isoToday, -i)
      const count = mappedAppointments.filter((a: any) => a.dateString === iso).length
      days.push({ day: fmtDateShort(iso), count })
    }
    return days
  }, [mappedAppointments, isoToday])

  const revenueByDoctor = useMemo(() => {
    return doctors.map((d: any) => {
      const total = mappedInvoices
        .filter((inv: any) => inv.status.toLowerCase() === "paid" && mappedAppointments.some((a: any) => a.patientId === inv.patientId && a.doctorId === d.id))
        .reduce((s: number, inv: any) => s + inv.items.reduce((a: number, it: any) => a + Number(it.amount), 0), 0)
      return { name: d.name.replace("Dr. ", ""), value: total || 0 }
    }).filter((d: any) => d.value > 0)
  }, [doctors, mappedInvoices, mappedAppointments])

  const pieColors = ["#1E4638", "#C8862B", "#386A8A", "#B5432F", "#5C7A67"]

  const stats = hasBilling ? [
    { 
      label: "Total patients", 
      value: planDetails?.patientLimit ? `${patients.length} / ${planDetails.patientLimit}` : patients.length, 
      icon: Users, 
      tint: "#DCE7EC", 
      color: "#386A8A", 
      delta: `${planDetails?.planName || "Starter"} plan`, 
      up: true 
    },
    { 
      label: "Today's appointments", 
      value: todays.length, 
      icon: CalendarClock, 
      tint: "#F3E3C6", 
      color: "#C8862B", 
      delta: `${todays.filter((a: any) => a.status.toLowerCase() === "completed").length} completed`, 
      up: true 
    },
    { 
      label: "Revenue this month", 
      value: currency(revenueThisMonth), 
      icon: TrendingUp, 
      tint: "#DCEADD", 
      color: "#2E6B3E", 
      delta: "Total collected", 
      up: true 
    },
    { 
      label: "Pending invoices", 
      value: currency(pendingAmount), 
      icon: Receipt, 
      tint: "#F3DBD3", 
      color: "#B5432F", 
      delta: `${mappedInvoices.filter((i: any) => i.status.toLowerCase() === "unpaid").length} unpaid`, 
      up: false 
    },
  ] : [
    { 
      label: "Total patients", 
      value: planDetails?.patientLimit ? `${patients.length} / ${planDetails.patientLimit}` : patients.length, 
      icon: Users, 
      tint: "#DCE7EC", 
      color: "#386A8A", 
      delta: `${planDetails?.planName || "Starter"} quota`, 
      up: true 
    },
    { 
      label: "Today's appointments", 
      value: todays.length, 
      icon: CalendarClock, 
      tint: "#F3E3C6", 
      color: "#C8862B", 
      delta: `${todays.filter((a: any) => a.status.toLowerCase() === "completed").length} completed`, 
      up: true 
    },
    { 
      label: "Doctors & Staff", 
      value: planDetails?.doctorLimit ? `${doctors.length} / ${planDetails.doctorLimit}` : doctors.length, 
      icon: Stethoscope, 
      tint: "#DCEADD", 
      color: "#2E6B3E", 
      delta: "Active staff", 
      up: true 
    },
    { 
      label: "Completed visits", 
      value: completedVisits, 
      icon: CheckCircle2, 
      tint: "#F3E3C6", 
      color: "#C8862B", 
      delta: "All-time", 
      up: true 
    },
  ]

  return (
    <div>
      {hasOnlineBooking && showPopup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}>
          <div style={{ background: "var(--paper)", width: 440, borderRadius: 12, padding: 24, position: "relative", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <button onClick={closePopup} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)" }}><X size={20} /></button>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: "var(--ink)" }}>Welcome to your Dashboard!</h2>
            <p style={{ fontSize: 14.5, color: "var(--ink-soft)", marginBottom: 20, lineHeight: 1.5 }}>
              Your clinic is set up and ready. Here is your public booking link. Share this with your patients so they can request appointments online.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--paper-raised)", border: "1px solid var(--line)", padding: "10px 12px", borderRadius: 8 }}>
              <input readOnly value={bookingUrl} style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "var(--ink)" }} />
              <button onClick={copyLink} style={{ background: "var(--forest)", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </button>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 16, textAlign: "center" }}>
              You can always find this link later in Settings.
            </p>
          </div>
        </div>
      )}

      {hasOnlineBooking && isClient && isNewClinic && !showPopup && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ background: "var(--amber-soft)", border: "1px solid var(--amber)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#6B4C15" }}>Your Public Booking Link is Ready</div>
              <div style={{ fontSize: 13, color: "#8E6924", marginTop: 4 }}>Share this link with your patients so they can request appointments online. <Link href="/dashboard/settings" style={{ color: "#6B4C15", textDecoration: "underline", fontWeight: 500, marginLeft: 4 }}>Find link in settings</Link></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--paper-raised)", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
              <LinkIcon size={14} color="var(--ink-soft)" />
              <span style={{ fontSize: 13, color: "var(--ink-soft)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", userSelect: "all" }}>{bookingUrl}</span>
              <button onClick={copyLink} style={{ background: "var(--moss)", color: "white", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontWeight: 600, fontSize: 12, marginLeft: 8 }}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="cw-stat-grid">
        {stats.map(s => (
          <div className="cw-stat-card" key={s.label}>
            <div className="top">
              <div className="icon" style={{ background: s.tint, color: s.color }}><s.icon size={15} /></div>
            </div>
            <div className="val">{s.value}</div>
            <div className="lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="cw-grid-2">
        <div className="cw-panel">
          <div className="cw-panel-head">
            <h3>Appointments, last 7 days</h3>
          </div>
          <div className="cw-panel-body">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ left: -20, top: 10 }}>
                <defs>
                  <linearGradient id="cwArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1E4638" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1E4638" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#DAD6C9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#5C6862" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#5C6862" }} axisLine={false} tickLine={false} allowDecimals={false} width={26} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DAD6C9", fontSize: 13 }} />
                <Area type="monotone" dataKey="count" stroke="#1E4638" strokeWidth={2.5} fill="url(#cwArea)" name="Appointments" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cw-panel">
          <div className="cw-panel-head"><h3>Today's schedule</h3></div>
          <div className="cw-panel-body">
            {todays.length === 0 && <div className="cw-empty" style={{ padding: "24px 0" }}><p>No appointments today.</p></div>}
            {todays.slice(0, 5).map((a: any) => {
              const p = patients.find((pp: any) => pp.id === a.patientId)
              return (
                <div className="cw-list-row" key={a.id}>
                  <div className="cw-avatar" style={{ background: p?.colorTag || "#1E4638", width: 32, height: 32, fontSize: 11.5 }}>{initials(p?.name || "?")}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p?.name}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{fmtTime12(a.time)} · {a.reason}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="cw-grid-2" style={{ marginTop: 16 }}>
        <div className="cw-panel">
          <div className="cw-panel-head">
            <h3>Recently added patients</h3>
            <Link href="/dashboard/patients" className="cw-btn cw-btn-ghost cw-btn-sm" style={{ textDecoration: 'none' }}>View all</Link>
          </div>
          <div className="cw-panel-body">
            {patients.slice(0, 4).map((p: any) => (
              <div className="cw-list-row" key={p.id}>
                <div className="cw-avatar" style={{ background: p.colorTag, width: 32, height: 32, fontSize: 11.5 }}>{initials(p.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{p.condition || "—"}</div>
                </div>
                <div className="mono" style={{ fontSize: 11.5, color: "var(--moss)" }}>{fmtDateShort(p.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="cw-panel">
          <div className="cw-panel-head">
            <h3>{hasRevenueReports ? "Revenue by doctor" : "Revenue Analytics"}</h3>
            {!hasRevenueReports && (
              <span style={{ fontSize: 11, background: "var(--paper-raised)", padding: "2px 6px", borderRadius: 4, color: "var(--ink-soft)", border: "1px solid var(--line)" }}>
                Clinic Group
              </span>
            )}
          </div>
          <div className="cw-panel-body">
            {hasRevenueReports ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {revenueByDoctor.length > 0 ? (
                  <>
                    <ResponsiveContainer width="55%" height={160}>
                      <PieChart>
                        <Pie data={revenueByDoctor} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={3}>
                          {revenueByDoctor.map((entry: any, i: number) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => currency(Number(v))} contentStyle={{ borderRadius: 8, border: "1px solid #DAD6C9", fontSize: 12.5 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex: 1 }}>
                      {revenueByDoctor.map((d: any, i: number) => (
                        <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12.5 }}>
                          <span style={{ width: 9, height: 9, borderRadius: "50%", background: pieColors[i % pieColors.length], flexShrink: 0 }} />
                          <span style={{ flex: 1 }}>{d.name}</span>
                          <span className="mono" style={{ color: "var(--ink-soft)" }}>{currency(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="cw-empty" style={{ padding: "24px 0", width: "100%" }}><p>No paid invoices yet.</p></div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "24px 16px" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--paper-raised)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", border: "1px solid var(--line)" }}>
                  <Lock size={18} color="var(--ink-soft)" />
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Doctor Revenue Reports Locked</div>
                <p style={{ fontSize: 12.5, color: "var(--ink-soft)", maxWidth: 280, margin: "0 auto 16px", lineHeight: 1.4 }}>
                  Comprehensive revenue breakdown by practitioner and financial reporting are available on the Clinic Group plan.
                </p>
                <Link href="/dashboard/settings?tab=subscription" className="cw-btn cw-btn-primary cw-btn-sm" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, color: "#ffffff" }}>
                  Upgrade Plan <ArrowUpRight size={13} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
