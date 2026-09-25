"use client"

import * as Switch from "@radix-ui/react-switch"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import {
  saveWhatsAppConnectionSettings,
  saveWhatsAppAccessToken,
  revealWhatsAppAccessToken,
  testWhatsAppConnectionAction,
  saveOtpChannelSettings,
  saveWhatsAppTemplateMapping,
} from "@/server/actions/admin/whatsapp-settings"
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
  TestTube2,
  Shield,
  Info,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface WaSettings {
  id: string
  whatsappNumber: string
  whatsappPhoneNumberId: string
  whatsappBusinessAccountId: string
  whatsappAccessTokenMasked: string
  whatsappAccessTokenSet: boolean
  whatsappWebhookVerifyToken: string
  whatsappConnected: boolean
  whatsappLastVerifiedAt: string | null
  whatsappLastError: string | null
  otpChannel: string
  otpBothMode: string
}

interface TemplateMapping {
  id: string
  eventType: string
  metaTemplateName: string
  isActive: boolean
}

interface ActivitySummary {
  sentToday: number
  sentThisWeek: number
  failedThisWeek: number
  deliveryRate: number | null
  recentLogs: any[]
}

// ─────────────────────────────────────────────────────────────
// Event type labels
// ─────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  OTP_VERIFICATION: "OTP Verification",
  APPOINTMENT_CONFIRMATION: "Appointment Confirmation",
  APPOINTMENT_REMINDER: "Appointment Reminder",
  APPOINTMENT_CANCELLED: "Appointment Cancelled / Rescheduled",
  GENERAL_UPDATE: "General Update",
}

const EVENT_VARS: Record<string, string> = {
  OTP_VERIFICATION: "otp_code, expiry_minutes",
  APPOINTMENT_CONFIRMATION: "clinic_name, clinic_address, clinic_phone, patient_name, doctor_name, date, time",
  APPOINTMENT_REMINDER: "clinic_name, patient_name, doctor_name, date, time",
  APPOINTMENT_CANCELLED: "clinic_name, patient_name, doctor_name, date, time",
  GENERAL_UPDATE: "clinic_name, message",
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export function WhatsAppSettingsTab({
  initialSettings,
  initialTemplates,
  initialActivity,
}: {
  initialSettings: WaSettings
  initialTemplates: TemplateMapping[]
  initialActivity: ActivitySummary
}) {
  const { confirm } = useConfirm()
  const [, startTransition] = useTransition()

  // ── Connection panel state ──
  const [conn, setConn] = useState({
    whatsappNumber: initialSettings.whatsappNumber,
    whatsappPhoneNumberId: initialSettings.whatsappPhoneNumberId,
    whatsappBusinessAccountId: initialSettings.whatsappBusinessAccountId,
    whatsappWebhookVerifyToken: initialSettings.whatsappWebhookVerifyToken,
  })
  const [connected, setConnected] = useState(initialSettings.whatsappConnected)
  const [lastVerified, setLastVerified] = useState(initialSettings.whatsappLastVerifiedAt)
  const [lastError, setLastError] = useState(initialSettings.whatsappLastError)
  const [savingConn, setSavingConn] = useState(false)
  const [testing, setTesting] = useState(false)

  // ── Token state ──
  const [showTokenModal, setShowTokenModal] = useState<"replace" | "reveal" | null>(null)
  const [tokenModalPw, setTokenModalPw] = useState("")
  const [tokenNewValue, setTokenNewValue] = useState("")
  const [revealedToken, setRevealedToken] = useState<string | null>(null)
  const [showRevealed, setShowRevealed] = useState(false)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenMasked, setTokenMasked] = useState(initialSettings.whatsappAccessTokenMasked)
  const [tokenSet, setTokenSet] = useState(initialSettings.whatsappAccessTokenSet)

  // ── OTP channel state ──
  const [otpChannel, setOtpChannel] = useState(initialSettings.otpChannel)
  const [otpBothMode, setOtpBothMode] = useState(initialSettings.otpBothMode || "USER_CHOOSES")
  const [savingOtp, setSavingOtp] = useState(false)

  // ── Template mappings state ──
  const [templates, setTemplates] = useState<TemplateMapping[]>(initialTemplates)
  const [savingTemplate, setSavingTemplate] = useState<string | null>(null)

  // ─────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────

  const handleSaveConn = async () => {
    setSavingConn(true)
    toast.promise(
      saveWhatsAppConnectionSettings(conn).then((res) => {
        if (!res.ok) throw new Error((res as any).error)
        setConnected(false)
        setLastError(null)
        return res
      }),
      {
        loading: "Saving connection settings…",
        success: "Connection settings saved — click Test Connection to verify",
        error: (e) => e.message || "Failed to save",
      }
    )
    setSavingConn(false)
  }

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      const res = await testWhatsAppConnectionAction()
      if (res.ok) {
        setConnected(true)
        setLastVerified(new Date().toISOString())
        setLastError(null)
        toast.success(res.message || "Connection verified")
      } else {
        setConnected(false)
        setLastError(res.error || "Unknown error")
        toast.error("Connection test failed: " + res.error)
      }
    } catch (e: any) {
      toast.error(e.message || "Failed")
    } finally {
      setTesting(false)
    }
  }

  const handleRevealToken = async () => {
    setTokenLoading(true)
    try {
      const res = await revealWhatsAppAccessToken(tokenModalPw)
      if (res.ok && res.token) {
        setRevealedToken(res.token)
        setShowRevealed(true)
        setShowTokenModal(null)
        setTokenModalPw("")
      } else {
        toast.error((res as any).error || "Failed to reveal token")
      }
    } catch (e: any) {
      toast.error(e.message || "Failed")
    } finally {
      setTokenLoading(false)
    }
  }

  const handleSaveToken = async () => {
    if (!tokenNewValue.trim()) {
      toast.error("Please enter a new access token")
      return
    }
    setTokenLoading(true)
    try {
      const res = await saveWhatsAppAccessToken({ newToken: tokenNewValue, adminPassword: tokenModalPw })
      if (res.ok) {
        const lastFour = tokenNewValue.slice(-4)
        setTokenMasked("••••••••" + lastFour)
        setTokenSet(true)
        setConnected(false)
        setShowTokenModal(null)
        setTokenModalPw("")
        setTokenNewValue("")
        toast.success("Access token saved — click Test Connection to verify the new credentials")
      } else {
        toast.error((res as any).error || "Failed to save token")
      }
    } catch (e: any) {
      toast.error(e.message || "Failed")
    } finally {
      setTokenLoading(false)
    }
  }

  const handleSaveOtp = async () => {
    setSavingOtp(true)
    toast.promise(
      saveOtpChannelSettings({
        otpChannel: otpChannel as any,
        otpBothMode: otpBothMode as any,
      }).then((res) => {
        if (!res.ok) throw new Error((res as any).error)
        return res
      }),
      {
        loading: "Saving OTP settings…",
        success: "OTP channel settings saved",
        error: (e) => e.message || "Failed to save",
      }
    )
    setSavingOtp(false)
  }

  const handleTemplateChange = (id: string, field: "metaTemplateName" | "isActive", value: string | boolean) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    )
  }

  const handleSaveTemplate = (t: TemplateMapping) => {
    setSavingTemplate(t.id)
    toast.promise(
      saveWhatsAppTemplateMapping({ id: t.id, metaTemplateName: t.metaTemplateName, isActive: t.isActive }).then(
        (res) => {
          if (!res.ok) throw new Error((res as any).error)
          setSavingTemplate(null)
          return res
        }
      ),
      {
        loading: "Saving template mapping…",
        success: "Template mapping saved",
        error: (e) => { setSavingTemplate(null); return e.message || "Failed" },
      }
    )
  }

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ── Section header ── */}
      <div>
        <div className="adm-section-label" style={{ marginBottom: 4 }}>WhatsApp / Communications</div>
        <p style={{ fontSize: 13.5, color: "var(--adm-muted)", margin: 0 }}>
          Configure the platform-level WhatsApp Business Account used for OTP verification and clinic appointment messages.
          All sends share one WABA number — each message is populated per-clinic at send time.
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────
          2.1 Connection panel
      ───────────────────────────────────────────────────── */}
      <div>
        {/* Status indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
          padding: "12px 16px",
          background: connected ? "rgba(46,107,62,0.08)" : "rgba(181,67,47,0.07)",
          border: `1px solid ${connected ? "rgba(46,107,62,0.25)" : "rgba(181,67,47,0.25)"}`,
          borderRadius: 10,
        }}>
          {connected
            ? <CheckCircle2 size={16} style={{ color: "var(--adm-success, #2E6B3E)", flexShrink: 0 }} />
            : <XCircle size={16} style={{ color: "var(--adm-coral)", flexShrink: 0 }} />
          }
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, fontSize: 13.5, color: connected ? "#2E6B3E" : "var(--adm-coral)" }}>
              {connected ? "Connected" : lastError ? "Connection error" : "Not connected"}
            </span>
            {lastVerified && connected && (
              <span style={{ fontSize: 12, color: "var(--adm-muted)", marginLeft: 8 }}>
                · Last verified: {new Date(lastVerified).toLocaleString()}
              </span>
            )}
            {lastError && !connected && (
              <div style={{ fontSize: 12, color: "var(--adm-coral)", marginTop: 2 }}>{lastError}</div>
            )}
          </div>
          <button
            className="adm-btn adm-btn-ghost adm-btn-sm"
            onClick={handleTestConnection}
            disabled={testing}
            id="test-whatsapp-connection-btn"
            style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
          >
            {testing
              ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
              : <TestTube2 size={13} />
            }
            {testing ? "Testing…" : "Test connection"}
          </button>
        </div>

        <div className="adm-section-label" style={{ marginBottom: 16 }}>Connection Credentials</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
          <div>
            <label className="adm-label">WhatsApp Business Number</label>
            <input
              id="wa-number"
              className="adm-input"
              value={conn.whatsappNumber}
              onChange={(e) => setConn((p) => ({ ...p, whatsappNumber: e.target.value }))}
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <label className="adm-label">Phone Number ID</label>
            <input
              id="wa-phone-number-id"
              className="adm-input adm-mono"
              value={conn.whatsappPhoneNumberId}
              onChange={(e) => setConn((p) => ({ ...p, whatsappPhoneNumberId: e.target.value }))}
              placeholder="Meta Cloud API Phone Number ID"
            />
          </div>
          <div>
            <label className="adm-label">WhatsApp Business Account ID (WABA ID)</label>
            <input
              id="wa-business-account-id"
              className="adm-input adm-mono"
              value={conn.whatsappBusinessAccountId}
              onChange={(e) => setConn((p) => ({ ...p, whatsappBusinessAccountId: e.target.value }))}
              placeholder="Meta WABA ID"
            />
          </div>

          {/* Access Token — masked, with Reveal + Replace actions */}
          <div>
            <label className="adm-label">Access Token</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                className="adm-input adm-mono"
                style={{
                  flex: 1, cursor: "default", userSelect: "none",
                  color: tokenSet ? "var(--adm-text)" : "var(--adm-muted)",
                  letterSpacing: tokenSet && !showRevealed ? 1 : 0,
                }}
              >
                {showRevealed && revealedToken
                  ? revealedToken
                  : tokenSet
                    ? tokenMasked
                    : "Not set"}
              </div>
              {showRevealed
                ? (
                  <button
                    className="adm-btn adm-btn-ghost adm-btn-sm adm-btn-icon"
                    onClick={() => { setShowRevealed(false); setRevealedToken(null) }}
                    title="Hide token"
                  >
                    <EyeOff size={14} />
                  </button>
                )
                : tokenSet && (
                  <button
                    className="adm-btn adm-btn-ghost adm-btn-sm"
                    onClick={() => setShowTokenModal("reveal")}
                    id="wa-reveal-token-btn"
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <Eye size={13} /> Reveal
                  </button>
                )
              }
              <button
                className="adm-btn adm-btn-ghost adm-btn-sm"
                onClick={() => setShowTokenModal("replace")}
                id="wa-replace-token-btn"
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <RefreshCw size={13} /> {tokenSet ? "Replace" : "Set token"}
              </button>
            </div>
            <p style={{ fontSize: 12, color: "var(--adm-muted)", marginTop: 4 }}>
              Long-lived system user token from Meta Business Manager. Encrypted at rest with AES-256-GCM.
            </p>
          </div>

          <div>
            <label className="adm-label">Webhook Verify Token</label>
            <input
              id="wa-webhook-verify-token"
              className="adm-input adm-mono"
              value={conn.whatsappWebhookVerifyToken}
              onChange={(e) => setConn((p) => ({ ...p, whatsappWebhookVerifyToken: e.target.value }))}
              placeholder="A secret string you choose — Meta sends it back to verify callbacks"
            />
            <p style={{ fontSize: 12, color: "var(--adm-muted)", marginTop: 4 }}>
              Used to validate incoming webhook calls from Meta.
              Set in your Meta app's Webhook configuration to the same value.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button
              className="adm-btn adm-btn-primary"
              onClick={handleSaveConn}
              disabled={savingConn}
              id="wa-save-connection-btn"
            >
              Save connection settings
            </button>
          </div>
        </div>
      </div>

      {/* Token modal */}
      {showTokenModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "var(--adm-card-bg, #fff)", border: "1px solid var(--adm-border)",
            borderRadius: 12, padding: 28, maxWidth: 420, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Shield size={18} style={{ color: "var(--adm-coral)" }} />
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {showTokenModal === "reveal" ? "Reveal access token" : "Replace access token"}
              </div>
            </div>
            <p style={{ fontSize: 13.5, color: "var(--adm-muted)", marginBottom: 16 }}>
              {showTokenModal === "reveal"
                ? "Re-enter your admin password to view the stored access token."
                : "Re-enter your admin password to replace the stored access token."}
            </p>

            {showTokenModal === "replace" && (
              <div style={{ marginBottom: 14 }}>
                <label className="adm-label">New access token</label>
                <input
                  className="adm-input adm-mono"
                  type="password"
                  value={tokenNewValue}
                  onChange={(e) => setTokenNewValue(e.target.value)}
                  placeholder="Paste token here"
                  id="wa-token-new-value"
                />
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label className="adm-label">Your admin password</label>
              <input
                className="adm-input"
                type="password"
                value={tokenModalPw}
                onChange={(e) => setTokenModalPw(e.target.value)}
                placeholder="Enter your password"
                id="wa-token-modal-password"
                onKeyDown={(e) => e.key === "Enter" && (showTokenModal === "reveal" ? handleRevealToken() : handleSaveToken())}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="adm-btn adm-btn-primary"
                onClick={showTokenModal === "reveal" ? handleRevealToken : handleSaveToken}
                disabled={tokenLoading}
                id="wa-token-modal-confirm-btn"
              >
                {tokenLoading ? "…" : showTokenModal === "reveal" ? "Reveal" : "Save token"}
              </button>
              <button
                className="adm-btn adm-btn-ghost"
                onClick={() => { setShowTokenModal(null); setTokenModalPw(""); setTokenNewValue("") }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 1, background: "var(--adm-border)" }} />

      {/* ─────────────────────────────────────────────────────
          2.2 OTP delivery panel
      ───────────────────────────────────────────────────── */}
      <div>
        <div className="adm-section-label" style={{ marginBottom: 4 }}>OTP Delivery Channel</div>
        <p style={{ fontSize: 13.5, color: "var(--adm-muted)", marginBottom: 18 }}>
          Controls which channel is used to send the 6-digit verification code during registration.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {[
            { value: "EMAIL", label: "Email only", desc: "Standard email OTP. Always works, no WhatsApp credentials required." },
            { value: "WHATSAPP", label: "WhatsApp only", desc: "Send OTP via WhatsApp template. Falls back to email automatically if the send fails." },
            { value: "BOTH", label: "Both channels", desc: "Configure whether users can choose or both codes are sent simultaneously." },
          ].map((opt) => (
            <label
              key={opt.value}
              htmlFor={`otp-channel-${opt.value}`}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer",
                padding: "12px 16px",
                border: `1px solid ${otpChannel === opt.value ? "rgba(30,70,56,0.35)" : "var(--adm-border)"}`,
                borderRadius: 10,
                background: otpChannel === opt.value ? "rgba(30,70,56,0.05)" : "transparent",
              }}
            >
              <input
                type="radio"
                id={`otp-channel-${opt.value}`}
                name="otpChannel"
                value={opt.value}
                checked={otpChannel === opt.value}
                onChange={() => setOtpChannel(opt.value)}
                style={{ marginTop: 2 }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{opt.label}</div>
                <div style={{ fontSize: 12.5, color: "var(--adm-muted)", marginTop: 2 }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        {/* Sub-option for BOTH */}
        {otpChannel === "BOTH" && (
          <div style={{
            marginBottom: 20, marginLeft: 16, paddingLeft: 16,
            borderLeft: "3px solid rgba(30,70,56,0.2)",
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: "var(--adm-muted)" }}>
              When both channels are selected:
            </div>
            {[
              { value: "USER_CHOOSES", label: "Let the user choose at registration", desc: "Show a small selector at step 1: \"Verify via WhatsApp\" or \"Verify via Email\"." },
              { value: "SEND_BOTH", label: "Send to both automatically", desc: "Both codes are sent simultaneously. Either code verifies the account." },
            ].map((opt) => (
              <label
                key={opt.value}
                htmlFor={`otp-both-mode-${opt.value}`}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
                  padding: "10px 14px",
                  border: `1px solid ${otpBothMode === opt.value ? "rgba(30,70,56,0.3)" : "var(--adm-border)"}`,
                  borderRadius: 8, marginBottom: 8,
                  background: otpBothMode === opt.value ? "rgba(30,70,56,0.04)" : "transparent",
                }}
              >
                <input
                  type="radio"
                  id={`otp-both-mode-${opt.value}`}
                  name="otpBothMode"
                  value={opt.value}
                  checked={otpBothMode === opt.value}
                  onChange={() => setOtpBothMode(opt.value)}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{opt.label}</div>
                  <div style={{ fontSize: 12.5, color: "var(--adm-muted)", marginTop: 2 }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Fallback note */}
        <div className="adm-info-box" style={{ marginBottom: 18 }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13 }}>
            <strong>Automatic fallback:</strong> If WhatsApp is selected but the send fails (invalid number,
            API error, or not connected), the system automatically falls back to email — the user is never
            left without a way to verify their account.
          </span>
        </div>

        <button
          className="adm-btn adm-btn-primary"
          onClick={handleSaveOtp}
          disabled={savingOtp}
          id="wa-save-otp-settings-btn"
        >
          Save OTP settings
        </button>
      </div>

      <div style={{ height: 1, background: "var(--adm-border)" }} />

      {/* ─────────────────────────────────────────────────────
          2.3 Template mapping panel
      ───────────────────────────────────────────────────── */}
      <div>
        <div className="adm-section-label" style={{ marginBottom: 4 }}>Template Mapping</div>
        <div className="adm-info-box" style={{ marginBottom: 18 }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13 }}>
            This panel maps OpenORDO event types to templates you have already created and got approved in{" "}
            <strong>Meta Business Manager</strong>. This is not a template editor — Meta requires templates to go through
            their own approval process first. Paste the exact approved template name here, then toggle it on.
            Until a name is entered, the toggle cannot be enabled.
          </span>
        </div>

        <div style={{ border: "1px solid var(--adm-border)", borderRadius: 10, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 220px 80px 80px",
            padding: "10px 16px", background: "var(--adm-bg)",
            borderBottom: "1px solid var(--adm-border)",
            fontSize: 12, fontWeight: 600, color: "var(--adm-muted)",
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            <span>Event</span>
            <span>Meta Template Name</span>
            <span style={{ textAlign: "center" }}>Active</span>
            <span>Save</span>
          </div>

          {templates.map((t, i) => (
            <div
              key={t.id}
              style={{
                display: "grid", gridTemplateColumns: "1fr 220px 80px 80px",
                padding: "14px 16px", alignItems: "center",
                borderBottom: i < templates.length - 1 ? "1px solid var(--adm-border)" : "none",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{EVENT_LABELS[t.eventType] || t.eventType}</div>
                <div style={{ fontSize: 11.5, color: "var(--adm-muted)", fontFamily: "monospace", marginTop: 2 }}>
                  vars: {EVENT_VARS[t.eventType] || "—"}
                </div>
              </div>

              <input
                className="adm-input adm-mono"
                style={{ fontSize: 12.5 }}
                value={t.metaTemplateName}
                onChange={(e) => handleTemplateChange(t.id, "metaTemplateName", e.target.value)}
                placeholder="approved_template_name"
                id={`wa-template-name-${t.eventType}`}
              />

              <div style={{ display: "flex", justifyContent: "center" }}>
                <Switch.Root
                  checked={t.isActive}
                  onCheckedChange={(val) => {
                    if (val && !t.metaTemplateName.trim()) {
                      toast.error("Enter a template name before enabling")
                      return
                    }
                    handleTemplateChange(t.id, "isActive", val)
                  }}
                  disabled={!t.metaTemplateName.trim()}
                  aria-label={`Enable ${EVENT_LABELS[t.eventType]}`}
                  id={`wa-template-active-${t.eventType}`}
                >
                  <Switch.Thumb />
                </Switch.Root>
              </div>

              <button
                className="adm-btn adm-btn-ghost adm-btn-sm"
                onClick={() => handleSaveTemplate(t)}
                disabled={savingTemplate === t.id}
                id={`wa-template-save-${t.eventType}`}
              >
                {savingTemplate === t.id ? "…" : "Save"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: "var(--adm-border)" }} />

      {/* ─────────────────────────────────────────────────────
          2.4 Activity summary
      ───────────────────────────────────────────────────── */}
      <div>
        <div className="adm-section-label" style={{ marginBottom: 16 }}>Activity Summary</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Sent today", value: initialActivity.sentToday.toString() },
            { label: "Sent this week", value: initialActivity.sentThisWeek.toString() },
            {
              label: "Delivery rate (7d)",
              value: initialActivity.deliveryRate !== null
                ? `${initialActivity.deliveryRate}%`
                : "—",
            },
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: "14px 18px",
              border: "1px solid var(--adm-border)", borderRadius: 10,
              background: "var(--adm-bg)",
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "monospace" }}>{stat.value}</div>
              <div style={{ fontSize: 12.5, color: "var(--adm-muted)", marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {initialActivity.failedThisWeek > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 14px", marginBottom: 20,
            background: "rgba(181,67,47,0.07)", border: "1px solid rgba(181,67,47,0.2)", borderRadius: 8,
            fontSize: 13, color: "var(--adm-coral)",
          }}>
            <XCircle size={14} />
            {initialActivity.failedThisWeek} failed message{initialActivity.failedThisWeek !== 1 ? "s" : ""} this week
          </div>
        )}

        {/* Recent log table — reusing adm-table pattern */}
        {initialActivity.recentLogs.length > 0 ? (
          <div style={{ border: "1px solid var(--adm-border)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr 90px 80px",
              padding: "9px 14px",
              background: "var(--adm-bg)",
              borderBottom: "1px solid var(--adm-border)",
              fontSize: 11.5, fontWeight: 700, color: "var(--adm-muted)",
              textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              <span>Sent at</span>
              <span>Phone / Event</span>
              <span>Status</span>
              <span>Clinic</span>
            </div>
            {initialActivity.recentLogs.map((log: any, i: number) => (
              <div
                key={log.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr 90px 80px",
                  padding: "10px 14px", alignItems: "center",
                  borderBottom: i < initialActivity.recentLogs.length - 1 ? "1px solid var(--adm-border)" : "none",
                  fontSize: 13,
                }}
              >
                <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--adm-muted)" }}>
                  {new Date(log.sentAt).toLocaleString()}
                </span>
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: 12.5 }}>{log.toPhone}</div>
                  <div style={{ fontSize: 12, color: "var(--adm-muted)" }}>{log.eventType}</div>
                  {log.errorMessage && (
                    <div style={{ fontSize: 11.5, color: "var(--adm-coral)", marginTop: 2 }}>{log.errorMessage}</div>
                  )}
                </div>
                <span style={{
                  fontSize: 11.5, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase",
                  color: log.status === "FAILED" ? "var(--adm-coral)" : "#2E6B3E",
                }}>
                  {log.status}
                </span>
                <span style={{ fontSize: 12, color: "var(--adm-muted)", fontFamily: "monospace" }}>
                  {log.clinicId ? log.clinicId.slice(-6) : "platform"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="adm-empty">
            <div className="adm-empty-icon"><MessageCircle size={22} /></div>
            <div className="adm-empty-title">No messages sent yet</div>
            <div className="adm-empty-desc">
              Messages sent via WhatsApp will appear here once the connection is configured and tested.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
