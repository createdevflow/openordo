"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { recordStaffConsent } from "@/server/actions/consent"
import { Check } from "lucide-react"
import Link from "next/link"

export function ConsentForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consentAccepted) return

    startTransition(async () => {
      setError(null)
      try {
        const res = await recordStaffConsent({
          userId,
          accepted: consentAccepted,
          documentTypes: ["TERMS", "PRIVACY"],
          versionLabel: new Date().toISOString().slice(0, 10),
        })

        if (!res.success) {
          setError(res.error || "Failed to record consent")
        } else {
          router.push("/dashboard")
        }
      } catch (err: any) {
        setError(err.message || "An error occurred")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md">
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 rounded-md text-[13px]">
          {error}
        </div>
      )}

      <div 
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 8,
          background: "var(--paper)",
          border: `1px solid ${consentAccepted ? "var(--forest)" : "var(--line)"}`,
          transition: "border-color 0.15s ease",
          cursor: "pointer",
          marginBottom: 24,
        }}
        onClick={() => setConsentAccepted(v => !v)}
      >
        <div style={{
          width: 18, height: 18, flexShrink: 0, borderRadius: 4, marginTop: 1,
          border: `2px solid ${consentAccepted ? "var(--forest)" : "var(--line)"}`,
          background: consentAccepted ? "var(--forest)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s ease",
        }}>
          {consentAccepted && <Check size={11} color="white" strokeWidth={3} />}
        </div>
        <span style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
          I agree to the{" "}
          <Link
            href="/legal/terms"
            target="_blank"
            onClick={e => e.stopPropagation()}
            style={{ color: "var(--forest)", fontWeight: 600, textDecoration: "underline" }}
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/legal/privacy"
            target="_blank"
            onClick={e => e.stopPropagation()}
            style={{ color: "var(--forest)", fontWeight: 600, textDecoration: "underline" }}
          >
            Privacy Policy
          </Link>
        </span>
      </div>

      <button
        type="submit"
        disabled={isPending || !consentAccepted}
        className="cw-btn cw-btn-primary w-full"
      >
        {isPending ? "Saving..." : "Continue to Dashboard"}
      </button>
    </form>
  )
}
