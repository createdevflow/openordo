"use client"

import { useState } from "react"
import { recordPatientPrivacyConsent } from "@/server/actions/consent"
import { Check } from "lucide-react"

export function PatientConsentForm({
  clinicSlug,
  clinicName,
  patientName,
  patientAccountId,
}: {
  clinicSlug: string
  clinicName: string
  patientName: string
  patientAccountId: string
}) {
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!accepted) return
    setSubmitting(true)
    setError(null)
    
    // In a real app, this would be fetched from the legal API, we use today's date for now
    const versionLabel = new Date().toISOString().slice(0, 10)
    
    const res = await recordPatientPrivacyConsent({
      patientAccountId,
      accepted,
      versionLabel,
    })

    if (res.success) {
      window.location.href = `/portal/${clinicSlug}`
    } else {
      setError(res.error || "Failed to save. Please try again.")
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      background: "var(--color-paper-raised)",
      borderRadius: 16,
      boxShadow: "0 2px 24px rgba(0,0,0,0.08)",
      padding: "40px",
      maxWidth: 480,
      width: "100%",
    }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--color-ink)", marginBottom: 8, fontFamily: "Georgia, serif" }}>
        Welcome, {patientName}
      </h1>
      <p style={{ fontSize: 14.5, color: "var(--color-ink-soft)", lineHeight: 1.6, marginBottom: 24 }}>
        Before accessing your records at <strong>{clinicName}</strong>, please review and accept our Privacy Policy. This ensures your medical data is handled according to your preferences.
      </p>

      <div 
        style={{
          display: "flex", alignItems: "flex-start", gap: 12, padding: "16px",
          borderRadius: 8, background: "var(--color-paper)",
          border: `1px solid ${accepted ? "var(--color-forest)" : "var(--color-line)"}`,
          cursor: "pointer", transition: "all 0.15s ease",
          marginBottom: 24
        }}
        onClick={() => setAccepted(!accepted)}
      >
        <div style={{
          width: 20, height: 20, flexShrink: 0, borderRadius: 4, marginTop: 1,
          border: `2px solid ${accepted ? "var(--color-forest)" : "var(--color-line)"}`,
          background: accepted ? "var(--color-forest)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s ease",
        }}>
          {accepted && <Check size={14} color="white" strokeWidth={3} />}
        </div>
        <span style={{ fontSize: 13.5, color: "var(--color-ink)", lineHeight: 1.5 }}>
          I agree to the OpenORDO{" "}
          <a
            href="/legal/privacy"
            target="_blank"
            onClick={e => e.stopPropagation()}
            style={{ color: "var(--color-forest)", fontWeight: 600, textDecoration: "underline" }}
          >
            Privacy Policy
          </a>
          {" "}regarding the processing of my health information.
        </span>
      </div>

      {error && (
        <div style={{ fontSize: 13, color: "var(--color-coral)", marginBottom: 16, fontWeight: 500 }}>
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || !accepted}
        style={{
          width: "100%", padding: "12px 0", borderRadius: 8, fontSize: 14.5, fontWeight: 600,
          background: (submitting || !accepted) ? "var(--color-line)" : "var(--color-forest)",
          color: (submitting || !accepted) ? "var(--color-ink-soft)" : "white",
          border: "none", cursor: (submitting || !accepted) ? "not-allowed" : "pointer",
          transition: "all 0.2s ease"
        }}
      >
        {submitting ? "Saving..." : "Continue to Portal"}
      </button>
    </div>
  )
}
