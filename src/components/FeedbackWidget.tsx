"use client"

/**
 * FeedbackWidget — CHARTWELL_PRELAUNCH_OPS_SPEC.md §4
 *
 * A "Send feedback" button in the dashboard shell that opens a compact modal.
 * Auto-captures current page URL and browser info for easier debugging.
 * Gated behind the BETA_FEEDBACK_WIDGET PlatformFlag — not rendered if flag is off.
 *
 * Submits to the existing ContactLead model via submitFeedback() action.
 */

import { useState, useCallback } from "react"
import { MessageSquarePlus, X, Send, ChevronDown } from "lucide-react"
import { submitFeedback } from "@/server/actions/feedback"

const REASON_OPTIONS = [
  "Technical support",
  "Bug report",
  "Feature request",
  "Billing question",
  "General feedback",
]

interface FeedbackWidgetProps {
  clinicId?: string
}

export function FeedbackWidget({ clinicId }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [reason, setReason] = useState(REASON_OPTIONS[0])
  const [showReasonDrop, setShowReasonDrop] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpen = useCallback(() => {
    setSent(false)
    setError(null)
    setMessage("")
    setReason(REASON_OPTIONS[0])
    setOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    if (!sending) setOpen(false)
  }, [sending])

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError("Please enter a message.")
      return
    }
    setSending(true)
    setError(null)
    const result = await submitFeedback({
      message,
      reason,
      pageUrl: typeof window !== "undefined" ? window.location.href : "",
      userAgent: typeof window !== "undefined" ? navigator.userAgent : "",
      clinicId,
    })
    setSending(false)
    if (result.success) {
      setSent(true)
      setTimeout(() => setOpen(false), 2200)
    } else {
      setError(result.error || "Failed to send. Please try again.")
    }
  }

  return (
    <>
      {/* Trigger button — sits in the sidebar/topbar footer */}
      <button
        id="feedback-widget-trigger"
        onClick={handleOpen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "7px 12px",
          borderRadius: 8,
          border: "1px solid var(--sidebar-border, rgba(255,255,255,0.1))",
          background: "transparent",
          color: "var(--sidebar-text-muted, rgba(255,255,255,0.6))",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.15s ease",
          width: "100%",
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.07)"
          e.currentTarget.style.color = "var(--sidebar-text, white)"
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = "transparent"
          e.currentTarget.style.color = "var(--sidebar-text-muted, rgba(255,255,255,0.6))"
        }}
      >
        <MessageSquarePlus size={14} />
        Send feedback
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
            padding: "0 24px 88px 0",
            background: "transparent",
            pointerEvents: "none",
          }}
        >
          {/* Modal card */}
          <div
            id="feedback-modal"
            style={{
              pointerEvents: "all",
              background: "var(--color-paper-raised, white)",
              border: "1px solid var(--color-line, #e0ddd8)",
              borderRadius: 14,
              boxShadow: "0 12px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)",
              width: 360,
              overflow: "hidden",
              animation: "feedbackSlideIn 0.2s ease",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "16px 18px",
              borderBottom: "1px solid var(--color-line, #e0ddd8)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "var(--color-forest, #1E4638)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MessageSquarePlus size={16} style={{ color: "rgba(255,255,255,0.8)" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
                  Send feedback
                </span>
              </div>
              <button
                onClick={handleClose}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,0.6)", display: "flex", padding: 2,
                  borderRadius: 4,
                }}
                aria-label="Close feedback modal"
              >
                <X size={16} />
              </button>
            </div>

            {sent ? (
              // Success state
              <div style={{ padding: "32px 18px", textAlign: "center" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "rgba(46, 107, 62, 0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 14px",
                }}>
                  <Send size={22} style={{ color: "#2E6B3E" }} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-ink, #1a1a1a)", marginBottom: 6 }}>
                  Thanks for your feedback!
                </p>
                <p style={{ fontSize: 13.5, color: "var(--color-ink-soft, #5c5c5c)" }}>
                  We'll review it shortly.
                </p>
              </div>
            ) : (
              // Form state
              <div style={{ padding: 18 }}>
                {/* Reason selector */}
                <div style={{ marginBottom: 14, position: "relative" }}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5, color: "var(--color-ink-soft, #5c5c5c)" }}>
                    Reason
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowReasonDrop(v => !v)}
                    style={{
                      width: "100%", padding: "9px 12px",
                      borderRadius: 8, border: "1px solid var(--color-line, #e0ddd8)",
                      background: "var(--color-paper, #f7f5f0)", fontSize: 13.5,
                      color: "var(--color-ink, #1a1a1a)", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      fontWeight: 500,
                    }}
                  >
                    {reason}
                    <ChevronDown size={14} style={{ color: "var(--color-ink-soft)", flexShrink: 0 }} />
                  </button>
                  {showReasonDrop && (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setShowReasonDrop(false)} />
                      <div style={{
                        position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
                        background: "var(--color-paper-raised, white)",
                        border: "1px solid var(--color-line, #e0ddd8)",
                        borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", overflow: "hidden",
                      }}>
                        {REASON_OPTIONS.map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => { setReason(opt); setShowReasonDrop(false) }}
                            style={{
                              display: "block", width: "100%", padding: "9px 12px",
                              textAlign: "left", background: reason === opt ? "rgba(30,70,56,0.06)" : "none",
                              border: "none", cursor: "pointer", fontSize: 13.5,
                              color: reason === opt ? "var(--color-forest, #1E4638)" : "var(--color-ink, #1a1a1a)",
                              fontWeight: reason === opt ? 600 : 400,
                            }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Message textarea */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5, color: "var(--color-ink-soft, #5c5c5c)" }}>
                    Message
                  </label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Describe the issue or share your thoughts…"
                    rows={4}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: "1px solid var(--color-line, #e0ddd8)",
                      background: "var(--color-paper, #f7f5f0)", fontSize: 13.5,
                      color: "var(--color-ink, #1a1a1a)", resize: "vertical",
                      lineHeight: 1.5, outline: "none", fontFamily: "inherit",
                    }}
                    onFocus={e => { e.target.style.borderColor = "var(--color-forest, #1E4638)" }}
                    onBlur={e => { e.target.style.borderColor = "var(--color-line, #e0ddd8)" }}
                  />
                </div>

                {error && (
                  <p style={{ fontSize: 12.5, color: "#B5432F", marginBottom: 10, fontWeight: 500 }}>
                    {error}
                  </p>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={sending || !message.trim()}
                  style={{
                    width: "100%", padding: "10px 0", borderRadius: 8,
                    background: (sending || !message.trim()) ? "var(--color-line, #e0ddd8)" : "var(--color-forest, #1E4638)",
                    color: (sending || !message.trim()) ? "var(--color-ink-soft, #5c5c5c)" : "white",
                    border: "none", cursor: (sending || !message.trim()) ? "not-allowed" : "pointer",
                    fontSize: 14, fontWeight: 700, transition: "all 0.15s ease",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  }}
                >
                  <Send size={14} />
                  {sending ? "Sending…" : "Send feedback"}
                </button>

                <p style={{ fontSize: 11.5, color: "var(--color-ink-soft, #5c5c5c)", marginTop: 10, textAlign: "center", lineHeight: 1.5 }}>
                  Your current page URL and browser info are captured automatically to help us debug.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes feedbackSlideIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}
