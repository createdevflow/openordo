"use client"

import React, { useState } from "react"
import { ChevronDown, CheckCircle, Loader2 } from "lucide-react"

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30"
]

function TimeDisplay(t: string) {
  const [h, m] = t.split(":").map(Number)
  const suffix = h >= 12 ? "PM" : "AM"
  const hr = ((h - 1) % 12 + 1).toString().padStart(2, "0")
  return `${hr}:${m.toString().padStart(2, "0")} ${suffix}`
}

export function BookingForm({
  clinicId,
  doctors,
  clinicPhone,
  appointmentTypes = [],
  accentColor = "#1E4638",
}: {
  clinicId: string
  doctors: any[]
  clinicPhone?: string | null
  appointmentTypes?: string[]
  accentColor?: string
}) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    doctorId: doctors[0]?.id || "",
    date: "", time: "", reason: "", notes: ""
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const set = (k: string) => (e: any) => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const today = new Date().toISOString().split("T")[0]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, clinicId })
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || "Submission failed. Please try again.")
      } else {
        setSuccess(true)
      }
    } catch {
      setError("Network error. Please check your connection.")
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div style={{
        background: "var(--paper-raised)", border: "1px solid var(--line)",
        borderRadius: 12, padding: "40px 28px", textAlign: "center",
      }}>
        <CheckCircle size={44} style={{ color: accentColor, marginBottom: 14 }} />
        <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: "var(--ink)" }}>
          Request Received!
        </h3>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0, lineHeight: 1.6, maxWidth: 340, marginInline: "auto" }}>
          Thanks, <strong>{form.name}</strong>. We&apos;ll review your request and reach out
          {form.email ? ` at ${form.email}` : ""}
          {form.phone ? ` or ${form.phone}` : ""} to confirm your slot.
        </p>
        {clinicPhone && (
          <p style={{ marginTop: 14, fontSize: 12.5, color: "var(--ink-soft)" }}>
            Need to reach us sooner? Call <strong>{clinicPhone}</strong>
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{
      background: "var(--paper-raised)", border: "1px solid var(--line)",
      borderRadius: 12, padding: "22px 22px 24px",
    }}>
      {error && (
        <div style={{
          marginBottom: 16, padding: "10px 14px",
          background: "var(--coral-soft)", color: "var(--coral)",
          borderRadius: 7, fontSize: 13.5, fontWeight: 500,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Row: Name + Email */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="bk-row">
          <div className="cw-field" style={{ marginBottom: 0 }}>
            <label>Full Name *</label>
            <input className="cw-input" value={form.name} onChange={set("name")} placeholder="Your name" required />
          </div>
          <div className="cw-field" style={{ marginBottom: 0 }}>
            <label>Email *</label>
            <input className="cw-input" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required />
          </div>
        </div>

        {/* Row: Phone + Doctor */}
        <div style={{ display: "grid", gridTemplateColumns: doctors.length > 0 ? "1fr 1fr" : "1fr", gap: 12 }} className="bk-row">
          <div className="cw-field" style={{ marginBottom: 0 }}>
            <label>Phone *</label>
            <input className="cw-input" type="tel" value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" required />
          </div>
          {doctors.length > 0 && (
            <div className="cw-field" style={{ marginBottom: 0 }}>
              <label>Preferred Doctor</label>
              <div style={{ position: "relative" }}>
                <select className="cw-select" value={form.doctorId} onChange={set("doctorId")} style={{ appearance: "none", paddingRight: 32 }}>
                  {doctors.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` — ${d.specialty}` : ""}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)", pointerEvents: "none" }} />
              </div>
            </div>
          )}
        </div>

        {/* Row: Date + Time */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="bk-row">
          <div className="cw-field" style={{ marginBottom: 0 }}>
            <label>Preferred Date *</label>
            <input className="cw-input" type="date" min={today} value={form.date} onChange={set("date")} required />
          </div>
          <div className="cw-field" style={{ marginBottom: 0 }}>
            <label>Preferred Time *</label>
            <div style={{ position: "relative" }}>
              <select className="cw-select" value={form.time} onChange={set("time")} required style={{ appearance: "none", paddingRight: 32 }}>
                <option value="">Select a time</option>
                {TIME_SLOTS.map(t => (
                  <option key={t} value={t}>{TimeDisplay(t)}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)", pointerEvents: "none" }} />
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="cw-field" style={{ marginBottom: 0 }}>
          <label>Reason for Visit *</label>
          {appointmentTypes.length > 0 ? (
            <div style={{ position: "relative" }}>
              <select className="cw-select" value={form.reason} onChange={set("reason")} required style={{ appearance: "none", paddingRight: 32 }}>
                <option value="">Select a reason…</option>
                {appointmentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)", pointerEvents: "none" }} />
            </div>
          ) : (
            <input className="cw-input" value={form.reason} onChange={set("reason")} placeholder="e.g. General checkup, follow-up…" required />
          )}
        </div>

        {/* Notes */}
        <div className="cw-field" style={{ marginBottom: 0 }}>
          <label>Additional Notes</label>
          <textarea className="cw-textarea" rows={2} value={form.notes} onChange={set("notes")} placeholder="Allergies, symptoms, or anything we should know…" />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="cw-btn"
          style={{
            width: "100%", justifyContent: "center", gap: 8, marginTop: 4,
            background: accentColor, borderColor: accentColor, color: "#fff",
            padding: "10px 20px", fontSize: 15, fontWeight: 600, borderRadius: 8,
          }}
        >
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
            : "Request Appointment"
          }
        </button>
      </form>

      {/* Stack form rows on very small screens */}
      <style>{`
        @media (max-width: 480px) {
          .bk-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
