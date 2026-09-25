"use client"

import React, { useState, useTransition } from "react"
import { CheckCircle, XCircle, Clock, Users, Search, AlertTriangle, TrendingUp, ExternalLink } from "lucide-react"
import { confirmBookingAction, rejectBookingAction } from "@/server/actions/bookings"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import Link from "next/link"

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}
function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number)
  const suffix = h >= 12 ? "PM" : "AM"
  return `${((h - 1) % 12 + 1).toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${suffix}`
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: "var(--amber-soft)", color: "var(--amber)" },
  CONFIRMED: { bg: "var(--success-soft)", color: "var(--success)" },
  REJECTED: { bg: "var(--coral-soft)", color: "var(--coral)" },
}

interface BookingUsage {
  current: number
  limit: number | null
  extraCapacity: number
  effectiveLimit: number | null
  planName: string
  nearingLimit: boolean
  overLimit: boolean
}

function BookingLimitBanner({ usage }: { usage: BookingUsage }) {
  if (!usage.effectiveLimit) return null // unlimited — no banner needed

  const pct = Math.min(100, Math.round((usage.current / usage.effectiveLimit) * 100))
  const remaining = Math.max(0, usage.effectiveLimit - usage.current)
  const isOver = usage.overLimit
  const isNearing = usage.nearingLimit && !isOver

  if (!isNearing && !isOver) return null

  const barColor = isOver ? "#dc2626" : "#d97706"
  const bgColor = isOver ? "rgba(220,38,38,0.06)" : "rgba(217,119,6,0.06)"
  const borderColor = isOver ? "rgba(220,38,38,0.25)" : "rgba(217,119,6,0.25)"
  const textColor = isOver ? "#dc2626" : "#92400e"
  const iconColor = isOver ? "#dc2626" : "#d97706"

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 10,
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 10,
      padding: "14px 18px",
      marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <AlertTriangle size={18} style={{ color: iconColor, flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: textColor, marginBottom: 3 }}>
            {isOver
              ? `Booking limit reached — new requests are paused`
              : `Approaching your monthly booking limit`}
          </div>
          <div style={{ fontSize: 13, color: textColor, opacity: 0.85 }}>
            {isOver
              ? `You've used all ${usage.effectiveLimit} bookings this month on the ${usage.planName} plan.`
              : `${remaining} of ${usage.effectiveLimit} bookings remaining this month (${usage.planName} plan).`}
            {" "}To keep receiving bookings, upgrade your plan or purchase extra capacity.
          </div>
        </div>
      </div>

      {/* Usage bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          flex: 1, height: 6, borderRadius: 99,
          background: "rgba(0,0,0,0.08)", overflow: "hidden"
        }}>
          <div style={{
            width: `${pct}%`, height: "100%",
            background: barColor,
            borderRadius: 99,
            transition: "width 0.4s ease",
          }} />
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: textColor, whiteSpace: "nowrap" }}>
          {usage.current} / {usage.effectiveLimit}
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Link href="/dashboard/billing" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 600,
          background: isOver ? "#dc2626" : "#d97706", color: "#fff",
          textDecoration: "none",
        }}>
          <TrendingUp size={13} /> Upgrade Plan
        </Link>
        <Link href="/dashboard/addons" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 600,
          background: "transparent",
          border: `1px solid ${borderColor}`,
          color: textColor,
          textDecoration: "none",
        }}>
          <ExternalLink size={13} /> Buy Extra Capacity
        </Link>
      </div>
    </div>
  )
}

export function BookingsClient({ bookings, doctors, bookingUsage }: { bookings: any[]; doctors: any[]; bookingUsage?: BookingUsage }) {

  const [filter, setFilter] = useState("PENDING")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [isPending, startTransition] = useTransition()
  const { showAlert } = useConfirm()

  const doctorName = (id: string) => doctors.find((d: any) => d.id === id)?.name || "Any available"

  const filtered = bookings
    .filter((b: any) => filter === "ALL" || b.status === filter)
    .filter((b: any) => {
      if (!searchTerm) return true
      const q = searchTerm.toLowerCase()
      const dName = doctorName(b.doctorId).toLowerCase()
      return b.name.toLowerCase().includes(q) || (b.email || "").toLowerCase().includes(q) || dName.includes(q)
    })
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const pendingCount = bookings.filter((b: any) => b.status === "PENDING").length

  function handleConfirmBooking(id: string) {
    startTransition(async () => {
      try { await confirmBookingAction(id) } catch { showAlert({ title: "Error", body: "Failed", tone: "danger" }) }
    })
  }
  function handleRejectBooking(id: string) {
    startTransition(async () => {
      try { await rejectBookingAction(id) } catch { showAlert({ title: "Error", body: "Failed", tone: "danger" }) }
    })
  }

  return (
    <div>
      {/* Booking limit warning banner */}
      {bookingUsage && <BookingLimitBanner usage={bookingUsage} />}

      {/* Stats */}
      <div className="cw-stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 22 }}>
        <div className="cw-stat-card">
          <div className="val" style={{ color: "var(--amber)" }}>{pendingCount}</div>
          <div className="lbl">Pending requests</div>
        </div>
        <div className="cw-stat-card">
          <div className="val" style={{ color: "var(--success)" }}>{bookings.filter((b: any) => b.status === "CONFIRMED").length}</div>
          <div className="lbl">Confirmed</div>
        </div>
        <div className="cw-stat-card">
          <div className="val">{bookings.length}</div>
          <div className="lbl">Total received</div>
        </div>
      </div>

      <div className="cw-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search requests..." 
            value={searchTerm} 
            onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1)}}
            className="cw-input !pl-9 w-48 sm:w-64 !m-0 !py-1.5"
          />
        </div>
        <div className="cw-chip-filter">
          {["PENDING", "CONFIRMED", "REJECTED", "ALL"].map(s => (
            <button key={s} className={`cw-chip ${filter === s ? "active" : ""}`} onClick={() => {setFilter(s); setCurrentPage(1)}}>
              {s[0] + s.slice(1).toLowerCase()}
              {s === "PENDING" && pendingCount > 0 && (
                <span style={{
                  marginLeft: 6, background: "var(--amber)", color: "#fff",
                  borderRadius: 10, padding: "1px 6px", fontSize: 10.5, fontWeight: 700
                }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="cw-panel"><div className="cw-empty">
          <div className="icon"><Users size={20} /></div>
          <h4>No {filter.toLowerCase()} requests</h4>
          <p>Appointment requests from your public booking page will appear here.</p>
        </div></div>
      ) : (
        <div className="cw-panel">
          <div className="cw-table-wrap">
            <table className="cw-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Contact</th>
                  <th>Doctor</th>
                  <th>Date & Time</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((b: any) => {
                  const sc = STATUS_COLORS[b.status] || STATUS_COLORS.PENDING
                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.name}</td>
                      <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                        {b.email}<br />{b.phone}
                      </td>
                      <td style={{ fontSize: 13 }}>{doctorName(b.doctorId)}</td>
                      <td className="num" style={{ fontSize: 13 }}>
                        {fmtDate(b.date)}<br />
                        <span style={{ color: "var(--ink-soft)" }}>{fmtTime(b.time)}</span>
                      </td>
                      <td style={{ fontSize: 13, maxWidth: 180 }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {b.reason}
                        </span>
                        {b.notes && <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{b.notes}</span>}
                      </td>
                      <td>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          background: sc.bg, color: sc.color,
                          padding: "3px 9px", borderRadius: 20, fontSize: 12, fontWeight: 600
                        }}>
                          {b.status === "PENDING" && <Clock size={11} />}
                          {b.status === "CONFIRMED" && <CheckCircle size={11} />}
                          {b.status === "REJECTED" && <XCircle size={11} />}
                          {b.status[0] + b.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td>
                        {b.status === "PENDING" && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button 
                              className="cw-btn cw-btn-ghost cw-btn-sm" 
                              style={{ padding: "6px 12px", background: "#FFFFFF", border: "1px solid #DAD6C9", color: "var(--success)" }}
                              disabled={isPending}
                              onClick={() => handleConfirmBooking(b.id)}
                            >
                              <CheckCircle size={15} /> Confirm
                            </button>
                            <button 
                              className="cw-btn cw-btn-ghost cw-btn-sm" 
                              style={{ padding: "6px 12px", background: "#FFFFFF", border: "1px solid #DAD6C9", color: "var(--coral)" }}
                              disabled={isPending}
                              onClick={() => handleRejectBooking(b.id)}
                            >
                              <XCircle size={15} /> Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-4 text-[13.5px] text-ink-soft gap-4 p-4 border-t border-line bg-white">
                <div>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} entries</div>
                <div className="flex items-center gap-2">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1.5 border border-line rounded bg-white hover:bg-paper-raised disabled:opacity-50 text-ink transition-colors font-medium">Previous</button>
                  <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1.5 border border-line rounded bg-white hover:bg-paper-raised disabled:opacity-50 text-ink transition-colors font-medium">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
