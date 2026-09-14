"use client"

import React, { useState } from "react"
import { ChevronDown, CheckCircle, Loader2 } from "lucide-react"

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30"
]

export function BookingForm({ clinicId, doctors, clinicPhone }: { clinicId: string; doctors: any[]; clinicPhone?: string | null }) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    doctorId: doctors[0]?.id || "",
    date: "", time: "", reason: "", notes: ""
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value })

  // Get today's date in YYYY-MM-DD for min date
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
        background: "var(--paper-raised)", border: "1px solid var(--line)", borderRadius: 14,
        padding: "48px 32px", textAlign: "center"
      }}>
        <CheckCircle size={48} style={{ color: "var(--forest)", marginBottom: 16 }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", color: "var(--ink)" }}>
          Request Received!
        </h2>
        <p style={{ fontSize: 14.5, color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>
          Thank you, <strong>{form.name}</strong>. We'll review your appointment request and reach out soon
          {form.email ? ` at ${form.email}` : ""}{form.phone ? ` or ${form.phone}` : ""}.
        </p>
        {clinicPhone && (
          <p style={{ marginTop: 16, fontSize: 13, color: "var(--ink-soft)" }}>
            Need to reach us sooner? Call <strong>{clinicPhone}</strong>
          </p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: "var(--paper-raised)", border: "1px solid var(--line)",
      borderRadius: 12, padding: 20
    }}>
      {error && (
        <div style={{
          marginBottom: 16, padding: "10px 14px", background: "var(--coral-soft)",
          color: "var(--coral)", borderRadius: 7, fontSize: 13.5, fontWeight: 500
        }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="cw-field" style={{ marginBottom: 0 }}>
          <label>Full Name *</label>
          <input className="cw-input" value={form.name} onChange={set("name")} placeholder="Your name" required />
        </div>
        <div className="cw-field" style={{ marginBottom: 0 }}>
          <label>Email *</label>
          <input className="cw-input" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="cw-field" style={{ marginBottom: 0 }}>
          <label>Phone *</label>
          <input className="cw-input" type="tel" value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" required />
        </div>
        {doctors.length > 0 && (
          <div className="cw-field" style={{ marginBottom: 0, position: "relative" }}>
            <label>Preferred Doctor</label>
            <div style={{ position: "relative" }}>
              <select className="cw-select" value={form.doctorId} onChange={set("doctorId")} style={{ paddingRight: 32, appearance: "none" }}>
                {doctors.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)", pointerEvents: "none" }} />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="cw-field" style={{ marginBottom: 0 }}>
          <label>Preferred Date *</label>
          <input className="cw-input" type="date" min={today} value={form.date} onChange={set("date")} required />
        </div>
        <div className="cw-field" style={{ marginBottom: 0, position: "relative" }}>
          <label>Preferred Time *</label>
          <div style={{ position: "relative" }}>
            <select className="cw-select" value={form.time} onChange={set("time")} required style={{ paddingRight: 32, appearance: "none" }}>
              <option value="">Select a time</option>
              {TIME_SLOTS.map(t => {
                const [h, m] = t.split(":").map(Number)
                const suffix = h >= 12 ? "PM" : "AM"
                const display = `${((h - 1) % 12 + 1).toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${suffix}`
                return <option key={t} value={t}>{display}</option>
              })}
            </select>
            <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)", pointerEvents: "none" }} />
          </div>
        </div>
      </div>

      <div className="cw-field" style={{ marginBottom: 12 }}>
        <label>Reason for Visit *</label>
        <input className="cw-input" value={form.reason} onChange={set("reason")} placeholder="e.g. General checkup, Dental pain…" required />
      </div>

      <div className="cw-field" style={{ marginBottom: 16 }}>
        <label>Additional Notes</label>
        <textarea className="cw-textarea" rows={2} value={form.notes} onChange={set("notes")} placeholder="Any symptoms, allergies, or relevant information…" />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="cw-btn cw-btn-primary"
        style={{ width: "100%", justifyContent: "center", gap: 8 }}
      >
        {loading ? (
          <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Submitting…</>
        ) : "Request Appointment"}
      </button>
    </form>
  )
}
