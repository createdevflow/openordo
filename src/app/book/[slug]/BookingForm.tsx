"use client"

import React, { useState } from "react"
import { ChevronDown, CheckCircle, Loader2, AlertCircle, CalendarX, Phone, Clock } from "lucide-react"
import { generateTimeSlots } from "@/lib/slot-capacity"

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
  clinicOpenTime,
  clinicCloseTime,
  appointmentTypes = [],
  accentColor = "#1E4638",
  isBookingEnabled = true,
  isBookingLimitReached = false,
  bookingLimitMessage = "",
  slotCapacityConfig,
}: {
  clinicId: string
  doctors: any[]
  clinicPhone?: string | null
  clinicOpenTime?: string | null
  clinicCloseTime?: string | null
  appointmentTypes?: string[]
  accentColor?: string
  isBookingEnabled?: boolean
  isBookingLimitReached?: boolean
  bookingLimitMessage?: string
  slotCapacityConfig?: {
    defaultCapacity: number
    slotOverrides: Record<string, number>
  }
}) {
  const initialSlots = React.useMemo(
    () => generateTimeSlots(clinicOpenTime, clinicCloseTime),
    [clinicOpenTime, clinicCloseTime]
  )
  const [slotsList, setSlotsList] = useState<string[]>(initialSlots)

  React.useEffect(() => {
    setSlotsList(generateTimeSlots(clinicOpenTime, clinicCloseTime))
  }, [clinicOpenTime, clinicCloseTime])
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    doctorId: doctors[0]?.id || "",
    date: "", time: "", reason: "", notes: ""
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  // Slot availability state
  const [slotStatusMap, setSlotStatusMap] = useState<Record<string, { capacity: number; booked: number; remaining: number; isFull: boolean }>>({})
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [alreadyBookedBanner, setAlreadyBookedBanner] = useState<string | null>(null)

  const set = (k: string) => (e: any) => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const today = new Date().toISOString().split("T")[0]

  // When date changes, query availability for that date
  React.useEffect(() => {
    if (!form.date) {
      setSlotStatusMap({})
      setAlreadyBookedBanner(null)
      return
    }

    let isMounted = true
    setLoadingSlots(true)

    fetch(`/api/book/availability?clinicId=${clinicId}&date=${form.date}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return
        if (data.timeSlots && Array.isArray(data.timeSlots) && data.timeSlots.length > 0) {
          setSlotsList(data.timeSlots)
        }
        if (data.slotStatus) {
          setSlotStatusMap(data.slotStatus)
          // If the currently chosen time is already full on this newly selected date
          if (form.time && data.slotStatus[form.time]?.isFull) {
            setAlreadyBookedBanner(`⚠️ Already Booked: The ${TimeDisplay(form.time)} time slot is already fully booked on ${form.date}. Please select another time.`)
            setForm(prev => ({ ...prev, time: "" }))
          } else {
            setAlreadyBookedBanner(null)
          }
        }
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setLoadingSlots(false)
      })

    return () => { isMounted = false }
  }, [form.date, clinicId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    // Validate slot capacity client-side
    if (form.time && slotStatusMap[form.time]?.isFull) {
      setAlreadyBookedBanner(`⚠️ Already Booked: The ${TimeDisplay(form.time)} time slot is already fully booked on ${form.date}. Please select an available slot.`)
      setError(`The ${TimeDisplay(form.time)} slot is already fully booked on this date. Please select another time.`)
      return
    }

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

  if (!isBookingEnabled) {
    return (
      <div style={{
        background: "var(--paper-raised)", border: "1px solid var(--line)",
        borderRadius: 12, padding: "40px 28px", textAlign: "center",
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", background: "var(--amber-soft)",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
          color: "var(--amber)"
        }}>
          <CalendarX size={26} />
        </div>
        <h3 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 8px", color: "var(--ink)" }}>
          Online Booking Unavailable
        </h3>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "0 0 20px", lineHeight: 1.6, maxWidth: 360, marginInline: "auto" }}>
          This clinic is currently not accepting online appointment requests. Please contact the clinic directly.
        </p>
        {clinicPhone && (
          <a
            href={`tel:${clinicPhone}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 22px", borderRadius: 8, background: accentColor,
              color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600
            }}
          >
            <Phone size={15} /> Call {clinicPhone}
          </a>
        )}
      </div>
    )
  }

  if (isBookingLimitReached) {
    return (
      <div style={{
        background: "var(--paper-raised)", border: "1px solid var(--line)",
        borderRadius: 12, padding: "40px 28px", textAlign: "center",
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", background: "var(--coral-soft)",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
          color: "var(--coral)"
        }}>
          <AlertCircle size={26} />
        </div>
        <h3 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 8px", color: "var(--ink)" }}>
          Monthly Booking Capacity Reached
        </h3>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "0 0 20px", lineHeight: 1.6, maxWidth: 380, marginInline: "auto" }}>
          {bookingLimitMessage || "This clinic has reached its allocated online booking capacity for this month. Please reach out to the clinic directly to schedule an appointment."}
        </p>
        {clinicPhone && (
          <a
            href={`tel:${clinicPhone}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 22px", borderRadius: 8, background: accentColor,
              color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600
            }}
          >
            <Phone size={15} /> Call {clinicPhone} to Book
          </a>
        )}
      </div>
    )
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

        {/* Preferred Date */}
        <div className="cw-field" style={{ marginBottom: 12 }}>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Preferred Date *</span>
            {form.date && (
              <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink-soft)" }}>
                {new Date(form.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
          </label>
          <input className="cw-input" type="date" min={today} value={form.date} onChange={set("date")} required />
        </div>

        {/* Preferred Time Slot with Capacity & Already Booked Banner */}
        <div className="cw-field" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={13} style={{ color: accentColor }} />
              Preferred Time *
            </label>
            {loadingSlots && (
              <span style={{ fontSize: 11.5, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 4 }}>
                <Loader2 size={12} className="animate-spin" /> Checking availability…
              </span>
            )}
          </div>

          {/* Banner: Displayed when a full/already-booked slot is clicked or detected */}
          {alreadyBookedBanner && (
            <div style={{
              padding: "10px 14px",
              background: "#FFF4E5",
              border: "1px solid #FFE0B2",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: "#B76E00",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, color: "#D97706" }} />
              <span>{alreadyBookedBanner}</span>
            </div>
          )}

          {/* Time Slot Chips Grid (never hidden; full slots marked as Already Booked) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
            gap: 7,
            marginTop: 4
          }}>
            {slotsList.map(t => {
              const info = slotStatusMap[t]
              const isFull = info?.isFull ?? false
              const isSelected = form.time === t

              return (
                <button
                  key={t}
                  type="button"
                  disabled={!form.date || isFull}
                  onClick={() => {
                    if (isFull) {
                      setAlreadyBookedBanner(`⚠️ Already Booked: The ${TimeDisplay(t)} time slot is already fully booked on ${form.date}. Please select an available slot.`)
                      return
                    }
                    setAlreadyBookedBanner(null)
                    setForm(prev => ({ ...prev, time: t }))
                  }}
                  title={isFull ? `${TimeDisplay(t)} is Already Booked` : `Select ${TimeDisplay(t)}`}
                  style={{
                    padding: "8px 6px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: isSelected ? 700 : 500,
                    textAlign: "center",
                    border: isSelected
                      ? `2px solid ${accentColor}`
                      : isFull
                      ? "1px dashed #E57373"
                      : "1px solid var(--line)",
                    background: isSelected
                      ? accentColor
                      : isFull
                      ? "#FFF5F5"
                      : "var(--paper)",
                    color: isSelected
                      ? "#fff"
                      : isFull
                      ? "#C62828"
                      : "var(--ink)",
                    cursor: !form.date ? "not-allowed" : isFull ? "not-allowed" : "pointer",
                    position: "relative",
                    transition: "all 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    opacity: !form.date ? 0.65 : 1,
                  }}
                >
                  <span style={{ textDecoration: isFull ? "line-through" : "none" }}>
                    {TimeDisplay(t)}
                  </span>
                  {isFull ? (
                    <span style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: "#C62828",
                      background: "#FFEBEE",
                      padding: "1px 5px",
                      borderRadius: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.02em"
                    }}>
                      Already Booked
                    </span>
                  ) : info && info.capacity > 1 ? (
                    <span style={{
                      fontSize: 9.5,
                      color: isSelected ? "rgba(255,255,255,0.85)" : "var(--ink-soft)"
                    }}>
                      {info.remaining} left
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          <input type="hidden" name="time" value={form.time} required />

          {!form.date ? (
            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6, marginBottom: 0 }}>
              Select a preferred date first to check time slot availability.
            </p>
          ) : !form.time ? (
            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6, marginBottom: 0 }}>
              Click an available time slot above to select your preferred time.
            </p>
          ) : null}
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
