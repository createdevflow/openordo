"use client"

import React, { useState, useTransition } from "react"
import { CheckCircle, XCircle, Clock, Users } from "lucide-react"
import { confirmBookingAction, rejectBookingAction } from "@/server/actions/bookings"
import { useConfirm } from "@/components/ui/ConfirmDialog"

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

export function BookingsClient({ bookings, doctors }: any) {
  const [filter, setFilter] = useState("PENDING")
  const [isPending, startTransition] = useTransition()
  const { showAlert } = useConfirm()

  const doctorName = (id: string) => doctors.find((d: any) => d.id === id)?.name || "Any available"

  const filtered = bookings
    .filter((b: any) => filter === "ALL" || b.status === filter)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

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

      <div className="cw-toolbar">
        <div className="cw-chip-filter">
          {["PENDING", "CONFIRMED", "REJECTED", "ALL"].map(s => (
            <button key={s} className={`cw-chip ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>
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
                {filtered.map((b: any) => {
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
          </div>
        </div>
      )}
    </div>
  )
}
