"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  CheckCircle2, XCircle, RefreshCw, TestTube2, Eye, EyeOff, Info, AlertTriangle
} from "lucide-react"
import {
  saveSmsIndiaSettings,
  saveSmsApiKeyIndia,
  revealSmsApiKeyIndia,
  testSmsConnectionIndiaAction,
  saveSmsInternationalSettings,
  saveSmsAuthTokenInternational,
  revealSmsAuthTokenInternational,
  testSmsConnectionInternationalAction,
  saveOtpChannelSettingsV2,
  saveAppointmentFallbackChannel,
} from "@/server/actions/admin/sms-settings"

interface SmsSettings {
  // India
  smsProviderIndia: string
  smsApiKeyIndiaMasked: string
  smsApiKeyIndiaSet: boolean
  smsSenderIdIndia: string
  smsDltTemplateIdOtp: string
  smsDltTemplateIdConfirmation: string
  smsConnectedIndia: boolean
  // International
  smsProviderInternational: string
  smsAccountSidInternational: string
  smsAuthTokenInternationalMasked: string
  smsAuthTokenInternationalSet: boolean
  smsFromNumberInternational: string
  smsConnectedInternational: boolean
  // Channel settings
  otpChannels: string[]
  otpMode: string
  appointmentConfirmationFallbackChannel: string
}

// ── Masked credential field (same pattern as WhatsApp Access Token) ──
function MaskedCredentialField({
  masked,
  isSet,
  revealed,
  showRevealed,
  onReveal,
  onHide,
  onReplace,
}: {
  masked: string
  isSet: boolean
  revealed: string | null
  showRevealed: boolean
  onReveal: () => void
  onHide: () => void
  onReplace: () => void
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        className="adm-input adm-mono"
        style={{
          flex: 1, cursor: "default", userSelect: "none",
          color: isSet ? "var(--adm-text)" : "var(--adm-muted)",
          letterSpacing: isSet && !showRevealed ? 1 : 0,
        }}
      >
        {showRevealed && revealed ? revealed : isSet ? masked : "Not set"}
      </div>
      {showRevealed ? (
        <button className="adm-btn adm-btn-ghost adm-btn-sm adm-btn-icon" onClick={onHide} title="Hide">
          <EyeOff size={14} />
        </button>
      ) : (
        isSet && (
          <button className="adm-btn adm-btn-ghost adm-btn-sm adm-btn-icon" onClick={onReveal} title="Reveal">
            <Eye size={14} />
          </button>
        )
      )}
      <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onReplace}>
        {isSet ? "Replace" : "Set"}
      </button>
    </div>
  )
}

// ── Status indicator ──
function StatusIndicator({
  connected,
  lastError,
  lastVerified,
  testing,
  onTest,
  testBtnId,
}: {
  connected: boolean
  lastError?: string | null
  lastVerified?: string | null
  testing: boolean
  onTest: () => void
  testBtnId: string
}) {
  return (
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
        onClick={onTest}
        disabled={testing}
        id={testBtnId}
        style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
      >
        {testing ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <TestTube2 size={13} />}
        {testing ? "Testing…" : "Test connection"}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function SmsSettingsSection({ initialSettings }: { initialSettings: SmsSettings }) {

  // ── India state ──
  const [indiaFields, setIndiaFields] = useState({
    smsProviderIndia: initialSettings.smsProviderIndia,
    smsSenderIdIndia: initialSettings.smsSenderIdIndia,
    smsDltTemplateIdOtp: initialSettings.smsDltTemplateIdOtp,
    smsDltTemplateIdConfirmation: initialSettings.smsDltTemplateIdConfirmation,
  })
  const [indiaConnected, setIndiaConnected] = useState(initialSettings.smsConnectedIndia)
  const [indiaSaving, setIndiaSaving] = useState(false)
  const [indiaTesting, setIndiaTesting] = useState(false)

  // India API key modal
  const [indiaKeyModal, setIndiaKeyModal] = useState<"replace" | "reveal" | null>(null)
  const [indiaKeyPw, setIndiaKeyPw] = useState("")
  const [indiaKeyNew, setIndiaKeyNew] = useState("")
  const [indiaKeyLoading, setIndiaKeyLoading] = useState(false)
  const [indiaKeyMasked, setIndiaKeyMasked] = useState(initialSettings.smsApiKeyIndiaMasked)
  const [indiaKeySet, setIndiaKeySet] = useState(initialSettings.smsApiKeyIndiaSet)
  const [indiaRevealed, setIndiaRevealed] = useState<string | null>(null)
  const [indiaShowRevealed, setIndiaShowRevealed] = useState(false)

  // ── International state ──
  const [intlFields, setIntlFields] = useState({
    smsAccountSidInternational: initialSettings.smsAccountSidInternational,
    smsFromNumberInternational: initialSettings.smsFromNumberInternational,
  })
  const [intlConnected, setIntlConnected] = useState(initialSettings.smsConnectedInternational)
  const [intlSaving, setIntlSaving] = useState(false)
  const [intlTesting, setIntlTesting] = useState(false)

  // International auth token modal
  const [intlTokenModal, setIntlTokenModal] = useState<"replace" | "reveal" | null>(null)
  const [intlTokenPw, setIntlTokenPw] = useState("")
  const [intlTokenNew, setIntlTokenNew] = useState("")
  const [intlTokenLoading, setIntlTokenLoading] = useState(false)
  const [intlTokenMasked, setIntlTokenMasked] = useState(initialSettings.smsAuthTokenInternationalMasked)
  const [intlTokenSet, setIntlTokenSet] = useState(initialSettings.smsAuthTokenInternationalSet)
  const [intlRevealed, setIntlRevealed] = useState<string | null>(null)
  const [intlShowRevealed, setIntlShowRevealed] = useState(false)

  // ── OTP channels state (multi-select) ──
  const [otpChannels, setOtpChannels] = useState<string[]>(initialSettings.otpChannels || ["EMAIL"])
  const [otpMode, setOtpMode] = useState(initialSettings.otpMode || "USER_CHOOSES")
  const [savingOtp, setSavingOtp] = useState(false)

  // ── Appointment fallback channel ──
  const [fallbackChannel, setFallbackChannel] = useState(initialSettings.appointmentConfirmationFallbackChannel || "EMAIL")
  const [savingFallback, setSavingFallback] = useState(false)

  // ─── India handlers ───

  const handleSaveIndia = async () => {
    setIndiaSaving(true)
    toast.promise(
      saveSmsIndiaSettings(indiaFields).then(res => { if (!res.ok) throw new Error((res as any).error); return res }),
      { loading: "Saving India SMS settings…", success: "India SMS settings saved", error: e => e.message || "Failed" }
    )
    setIndiaSaving(false)
  }

  const handleTestIndia = async () => {
    setIndiaTesting(true)
    try {
      const res = await testSmsConnectionIndiaAction()
      if (res.success) {
        setIndiaConnected(true)
        toast.success(res.displayInfo ? `Connected · ${res.displayInfo}` : "India SMS connected")
      } else {
        setIndiaConnected(false)
        toast.error("India SMS test failed: " + res.error)
      }
    } catch (e: any) { toast.error(e.message) }
    setIndiaTesting(false)
  }

  const handleRevealIndiaKey = async () => {
    setIndiaKeyLoading(true)
    const res = await revealSmsApiKeyIndia(indiaKeyPw)
    if (res.ok && res.token) {
      setIndiaRevealed(res.token)
      setIndiaShowRevealed(true)
      setIndiaKeyModal(null)
      setIndiaKeyPw("")
    } else toast.error((res as any).error || "Failed to reveal")
    setIndiaKeyLoading(false)
  }

  const handleSaveIndiaKey = async () => {
    if (!indiaKeyNew.trim()) { toast.error("Enter a new API key"); return }
    setIndiaKeyLoading(true)
    const res = await saveSmsApiKeyIndia({ newApiKey: indiaKeyNew, adminPassword: indiaKeyPw })
    if (res.ok) {
      setIndiaKeyMasked("••••••••" + indiaKeyNew.slice(-4))
      setIndiaKeySet(true)
      setIndiaConnected(false)
      setIndiaKeyModal(null)
      setIndiaKeyPw("")
      setIndiaKeyNew("")
      toast.success("API key saved — click Test Connection to verify")
    } else toast.error((res as any).error || "Failed to save")
    setIndiaKeyLoading(false)
  }

  // ─── International handlers ───

  const handleSaveIntl = async () => {
    setIntlSaving(true)
    toast.promise(
      saveSmsInternationalSettings(intlFields).then(res => { if (!res.ok) throw new Error((res as any).error); return res }),
      { loading: "Saving Twilio settings…", success: "Twilio settings saved", error: e => e.message || "Failed" }
    )
    setIntlSaving(false)
  }

  const handleTestIntl = async () => {
    setIntlTesting(true)
    try {
      const res = await testSmsConnectionInternationalAction()
      if (res.success) {
        setIntlConnected(true)
        toast.success(res.displayInfo ? `Connected · ${res.displayInfo}` : "Twilio connected")
      } else {
        setIntlConnected(false)
        toast.error("Twilio test failed: " + res.error)
      }
    } catch (e: any) { toast.error(e.message) }
    setIntlTesting(false)
  }

  const handleRevealIntlToken = async () => {
    setIntlTokenLoading(true)
    const res = await revealSmsAuthTokenInternational(intlTokenPw)
    if (res.ok && res.token) {
      setIntlRevealed(res.token)
      setIntlShowRevealed(true)
      setIntlTokenModal(null)
      setIntlTokenPw("")
    } else toast.error((res as any).error || "Failed to reveal")
    setIntlTokenLoading(false)
  }

  const handleSaveIntlToken = async () => {
    if (!intlTokenNew.trim()) { toast.error("Enter a new auth token"); return }
    setIntlTokenLoading(true)
    const res = await saveSmsAuthTokenInternational({ newToken: intlTokenNew, adminPassword: intlTokenPw })
    if (res.ok) {
      setIntlTokenMasked("••••••••" + intlTokenNew.slice(-4))
      setIntlTokenSet(true)
      setIntlConnected(false)
      setIntlTokenModal(null)
      setIntlTokenPw("")
      setIntlTokenNew("")
      toast.success("Auth token saved — click Test Connection to verify")
    } else toast.error((res as any).error || "Failed to save")
    setIntlTokenLoading(false)
  }

  // ─── OTP channel handlers ───

  const toggleOtpChannel = (channel: string) => {
    setOtpChannels(prev => {
      if (prev.includes(channel)) {
        // Don't allow removing the last channel
        if (prev.length === 1) { toast.error("At least one OTP channel must be selected"); return prev }
        return prev.filter(c => c !== channel)
      } else {
        return [...prev, channel]
      }
    })
  }

  const handleSaveOtp = async () => {
    setSavingOtp(true)
    toast.promise(
      saveOtpChannelSettingsV2({ otpChannels, otpMode }).then(res => { if (!res.ok) throw new Error((res as any).error); return res }),
      { loading: "Saving OTP settings…", success: "OTP channel settings saved", error: e => e.message || "Failed" }
    )
    setSavingOtp(false)
  }

  const handleSaveFallback = async () => {
    setSavingFallback(true)
    toast.promise(
      saveAppointmentFallbackChannel(fallbackChannel as "EMAIL" | "SMS").then(res => { if (!res.ok) throw new Error((res as any).error); return res }),
      { loading: "Saving fallback channel…", success: "Appointment fallback channel saved", error: e => e.message || "Failed" }
    )
    setSavingFallback(false)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ─── Section header ─── */}
      <div>
        <div className="adm-section-label" style={{ marginBottom: 4 }}>SMS — India (MSG91 / Kaleyra)</div>
        <p style={{ fontSize: 13.5, color: "var(--adm-muted)", margin: 0 }}>
          SMS for Indian phone numbers (+91). Requires DLT-registered Sender ID and template IDs per TRAI regulations.
        </p>
      </div>

      {/* ⚠️ DLT compliance warning */}
      <div className="adm-info-box" style={{ background: "rgba(181,67,47,0.07)", border: "1px solid rgba(181,67,47,0.2)" }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1, color: "var(--adm-coral)" }} />
        <span style={{ fontSize: 13, color: "var(--adm-coral)" }}>
          <strong>DLT Compliance Required:</strong> India SMS will not work without real, pre-registered DLT template IDs.
          Register your Sender ID and templates through your SMS provider (MSG91/Kaleyra) before enabling this block.
          See BUILD_LOG.md Step 8 for details.
        </span>
      </div>

      {/* India status + test */}
      <StatusIndicator
        connected={indiaConnected}
        testing={indiaTesting}
        onTest={handleTestIndia}
        testBtnId="sms-india-test-btn"
      />

      {/* India fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
        <div>
          <label className="adm-label">Provider</label>
          <select
            className="adm-input"
            value={indiaFields.smsProviderIndia}
            onChange={e => setIndiaFields(p => ({ ...p, smsProviderIndia: e.target.value }))}
            id="sms-india-provider"
          >
            <option value="MSG91">MSG91</option>
            <option value="KALEYRA">Kaleyra</option>
          </select>
        </div>
        <div>
          <label className="adm-label">API Key</label>
          <MaskedCredentialField
            masked={indiaKeyMasked}
            isSet={indiaKeySet}
            revealed={indiaRevealed}
            showRevealed={indiaShowRevealed}
            onReveal={() => setIndiaKeyModal("reveal")}
            onHide={() => { setIndiaShowRevealed(false); setIndiaRevealed(null) }}
            onReplace={() => setIndiaKeyModal("replace")}
          />
        </div>
        <div>
          <label className="adm-label">Sender ID <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--adm-muted)" }}>(6-char DLT-registered)</span></label>
          <input
            className="adm-input adm-mono"
            value={indiaFields.smsSenderIdIndia}
            onChange={e => setIndiaFields(p => ({ ...p, smsSenderIdIndia: e.target.value }))}
            placeholder="CLINWT"
            maxLength={6}
            id="sms-india-sender-id"
          />
        </div>
        <div>
          <label className="adm-label">DLT Template ID — OTP Verification</label>
          <input
            className="adm-input adm-mono"
            value={indiaFields.smsDltTemplateIdOtp}
            onChange={e => setIndiaFields(p => ({ ...p, smsDltTemplateIdOtp: e.target.value }))}
            placeholder="1707xxxxxxxxxxxxxxxx"
            id="sms-india-dlt-otp"
          />
          <div style={{ fontSize: 12, color: "var(--adm-muted)", marginTop: 4 }}>
            Must match the template registered on the DLT portal exactly.
          </div>
        </div>
        <div>
          <label className="adm-label">DLT Template ID — Appointment Confirmation</label>
          <input
            className="adm-input adm-mono"
            value={indiaFields.smsDltTemplateIdConfirmation}
            onChange={e => setIndiaFields(p => ({ ...p, smsDltTemplateIdConfirmation: e.target.value }))}
            placeholder="1707xxxxxxxxxxxxxxxx"
            id="sms-india-dlt-confirmation"
          />
        </div>
        <button className="adm-btn adm-btn-primary" style={{ alignSelf: "flex-start" }} onClick={handleSaveIndia} disabled={indiaSaving} id="sms-india-save-btn">
          {indiaSaving ? "Saving…" : "Save India SMS Settings"}
        </button>
      </div>

      <div style={{ height: 1, background: "var(--adm-border)" }} />

      {/* ─── International (Twilio) block ─── */}
      <div>
        <div className="adm-section-label" style={{ marginBottom: 4 }}>SMS — International (Twilio)</div>
        <p style={{ fontSize: 13.5, color: "var(--adm-muted)", margin: 0 }}>
          SMS for all non-Indian phone numbers. Uses Twilio. No DLT registration required.
        </p>
      </div>

      <StatusIndicator
        connected={intlConnected}
        testing={intlTesting}
        onTest={handleTestIntl}
        testBtnId="sms-intl-test-btn"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
        <div>
          <label className="adm-label">Twilio Account SID</label>
          <input
            className="adm-input adm-mono"
            value={intlFields.smsAccountSidInternational}
            onChange={e => setIntlFields(p => ({ ...p, smsAccountSidInternational: e.target.value }))}
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            id="sms-intl-account-sid"
          />
        </div>
        <div>
          <label className="adm-label">Auth Token</label>
          <MaskedCredentialField
            masked={intlTokenMasked}
            isSet={intlTokenSet}
            revealed={intlRevealed}
            showRevealed={intlShowRevealed}
            onReveal={() => setIntlTokenModal("reveal")}
            onHide={() => { setIntlShowRevealed(false); setIntlRevealed(null) }}
            onReplace={() => setIntlTokenModal("replace")}
          />
        </div>
        <div>
          <label className="adm-label">From Number <span style={{ fontSize: 12, color: "var(--adm-muted)" }}>(E.164 format)</span></label>
          <input
            className="adm-input adm-mono"
            value={intlFields.smsFromNumberInternational}
            onChange={e => setIntlFields(p => ({ ...p, smsFromNumberInternational: e.target.value }))}
            placeholder="+15551234567"
            id="sms-intl-from-number"
          />
        </div>
        <button className="adm-btn adm-btn-primary" style={{ alignSelf: "flex-start" }} onClick={handleSaveIntl} disabled={intlSaving} id="sms-intl-save-btn">
          {intlSaving ? "Saving…" : "Save Twilio Settings"}
        </button>
      </div>

      <div style={{ height: 1, background: "var(--adm-border)" }} />

      {/* ─── OTP channel multi-select ─── */}
      <div>
        <div className="adm-section-label" style={{ marginBottom: 4 }}>OTP Delivery Channels</div>
        <p style={{ fontSize: 13.5, color: "var(--adm-muted)", marginBottom: 18 }}>
          Select which channels are used to send the 6-digit verification code during staff registration.
          SMS sends to the registering user&apos;s phone number — requires SMS to be configured above.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {[
            { value: "EMAIL", label: "Email", desc: "Standard email OTP. Always works without additional configuration." },
            { value: "WHATSAPP", label: "WhatsApp", desc: "Send OTP via WhatsApp template. Requires WhatsApp integration to be configured." },
            { value: "SMS", label: "SMS", desc: "Send OTP via SMS to the registering user's phone number. Requires SMS to be configured above." },
          ].map(opt => (
            <label
              key={opt.value}
              htmlFor={`otp-ch-${opt.value}`}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer",
                padding: "12px 16px",
                border: `1px solid ${otpChannels.includes(opt.value) ? "rgba(30,70,56,0.35)" : "var(--adm-border)"}`,
                borderRadius: 10,
                background: otpChannels.includes(opt.value) ? "rgba(30,70,56,0.05)" : "transparent",
              }}
            >
              <input
                type="checkbox"
                id={`otp-ch-${opt.value}`}
                checked={otpChannels.includes(opt.value)}
                onChange={() => toggleOtpChannel(opt.value)}
                style={{ marginTop: 3 }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{opt.label}</div>
                <div style={{ fontSize: 12.5, color: "var(--adm-muted)", marginTop: 2 }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        {otpChannels.length > 1 && (
          <div style={{ marginBottom: 20, marginLeft: 16, paddingLeft: 16, borderLeft: "3px solid rgba(30,70,56,0.2)" }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: "var(--adm-muted)" }}>
              When multiple channels are selected:
            </div>
            {[
              { value: "USER_CHOOSES", label: "Let the user choose at registration", desc: "Show a channel selector at step 1 so the user picks their preferred verification method." },
              { value: "SEND_ALL", label: "Send to all selected channels automatically", desc: "All selected channels are attempted simultaneously. Any valid code verifies the account." },
            ].map(opt => (
              <label
                key={opt.value}
                htmlFor={`otp-mode-${opt.value}`}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
                  padding: "10px 14px",
                  border: `1px solid ${otpMode === opt.value ? "rgba(30,70,56,0.3)" : "var(--adm-border)"}`,
                  borderRadius: 8, marginBottom: 8,
                  background: otpMode === opt.value ? "rgba(30,70,56,0.04)" : "transparent",
                }}
              >
                <input
                  type="radio"
                  id={`otp-mode-${opt.value}`}
                  name="otpMode"
                  value={opt.value}
                  checked={otpMode === opt.value}
                  onChange={() => setOtpMode(opt.value)}
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

        <div className="adm-info-box" style={{ marginBottom: 18 }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13 }}>
            <strong>Automatic fallback:</strong> If WhatsApp or SMS is selected but the send fails,
            the system automatically falls back to email if the user's email is available.
            The user is never left without a way to verify their account.
          </span>
        </div>

        <button className="adm-btn adm-btn-primary" onClick={handleSaveOtp} disabled={savingOtp} id="sms-save-otp-btn">
          Save OTP Channel Settings
        </button>
      </div>

      <div style={{ height: 1, background: "var(--adm-border)" }} />

      {/* ─── Appointment confirmation fallback ─── */}
      <div>
        <div className="adm-section-label" style={{ marginBottom: 4 }}>Appointment Confirmation Fallback Channel</div>
        <div className="adm-info-box" style={{ marginBottom: 18 }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13 }}>
            This setting applies <strong>only to clinics that do not have the WhatsApp Reminders add-on active.</strong>
            Clinics with the WhatsApp Reminders add-on always send appointment confirmations via WhatsApp (unchanged behavior).
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {[
            {
              value: "EMAIL",
              label: "Email only",
              desc: "Send appointment confirmation email only. Default behavior — no SMS configuration required.",
            },
            {
              value: "SMS",
              label: "SMS (+ Email as durable record)",
              desc: "Send an SMS confirmation to the patient's phone number AND send the email confirmation alongside it. Requires SMS to be configured above.",
            },
          ].map(opt => (
            <label
              key={opt.value}
              htmlFor={`fallback-ch-${opt.value}`}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer",
                padding: "12px 16px",
                border: `1px solid ${fallbackChannel === opt.value ? "rgba(30,70,56,0.35)" : "var(--adm-border)"}`,
                borderRadius: 10,
                background: fallbackChannel === opt.value ? "rgba(30,70,56,0.05)" : "transparent",
              }}
            >
              <input
                type="radio"
                id={`fallback-ch-${opt.value}`}
                name="fallbackChannel"
                value={opt.value}
                checked={fallbackChannel === opt.value}
                onChange={() => setFallbackChannel(opt.value)}
                style={{ marginTop: 2 }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{opt.label}</div>
                <div style={{ fontSize: 12.5, color: "var(--adm-muted)", marginTop: 2 }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <button className="adm-btn adm-btn-primary" onClick={handleSaveFallback} disabled={savingFallback} id="sms-save-fallback-btn">
          Save Fallback Channel
        </button>
      </div>

      {/* ─── India API Key modal ─── */}
      {indiaKeyModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => { setIndiaKeyModal(null); setIndiaKeyPw(""); setIndiaKeyNew("") }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "var(--adm-card-bg)", border: "1px solid var(--adm-border)", borderRadius: 12,
            padding: 28, width: 420, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {indiaKeyModal === "reveal" ? "Reveal India API Key" : "Replace India API Key"}
            </div>
            <div style={{ fontSize: 13.5, color: "var(--adm-muted)" }}>
              {indiaKeyModal === "reveal"
                ? "Enter your admin password to reveal the stored API key."
                : "Enter the new API key and your admin password to save it."}
            </div>
            {indiaKeyModal === "replace" && (
              <div>
                <label className="adm-label">New API Key</label>
                <input
                  className="adm-input adm-mono"
                  type="password"
                  value={indiaKeyNew}
                  onChange={e => setIndiaKeyNew(e.target.value)}
                  placeholder="MSG91 API key"
                  autoFocus
                />
              </div>
            )}
            <div>
              <label className="adm-label">Your Admin Password</label>
              <input
                className="adm-input"
                type="password"
                value={indiaKeyPw}
                onChange={e => setIndiaKeyPw(e.target.value)}
                placeholder="Required to proceed"
                onKeyDown={e => e.key === "Enter" && (indiaKeyModal === "reveal" ? handleRevealIndiaKey() : handleSaveIndiaKey())}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="adm-btn adm-btn-primary" onClick={indiaKeyModal === "reveal" ? handleRevealIndiaKey : handleSaveIndiaKey} disabled={indiaKeyLoading}>
                {indiaKeyLoading ? "…" : indiaKeyModal === "reveal" ? "Reveal" : "Save key"}
              </button>
              <button className="adm-btn adm-btn-ghost" onClick={() => { setIndiaKeyModal(null); setIndiaKeyPw(""); setIndiaKeyNew("") }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── International Auth Token modal ─── */}
      {intlTokenModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => { setIntlTokenModal(null); setIntlTokenPw(""); setIntlTokenNew("") }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "var(--adm-card-bg)", border: "1px solid var(--adm-border)", borderRadius: 12,
            padding: 28, width: 420, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {intlTokenModal === "reveal" ? "Reveal Twilio Auth Token" : "Replace Twilio Auth Token"}
            </div>
            <div style={{ fontSize: 13.5, color: "var(--adm-muted)" }}>
              {intlTokenModal === "reveal"
                ? "Enter your admin password to reveal the stored auth token."
                : "Enter the new auth token and your admin password to save it."}
            </div>
            {intlTokenModal === "replace" && (
              <div>
                <label className="adm-label">New Auth Token</label>
                <input
                  className="adm-input adm-mono"
                  type="password"
                  value={intlTokenNew}
                  onChange={e => setIntlTokenNew(e.target.value)}
                  placeholder="Twilio Auth Token"
                  autoFocus
                />
              </div>
            )}
            <div>
              <label className="adm-label">Your Admin Password</label>
              <input
                className="adm-input"
                type="password"
                value={intlTokenPw}
                onChange={e => setIntlTokenPw(e.target.value)}
                placeholder="Required to proceed"
                onKeyDown={e => e.key === "Enter" && (intlTokenModal === "reveal" ? handleRevealIntlToken() : handleSaveIntlToken())}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="adm-btn adm-btn-primary" onClick={intlTokenModal === "reveal" ? handleRevealIntlToken : handleSaveIntlToken} disabled={intlTokenLoading}>
                {intlTokenLoading ? "…" : intlTokenModal === "reveal" ? "Reveal" : "Save token"}
              </button>
              <button className="adm-btn adm-btn-ghost" onClick={() => { setIntlTokenModal(null); setIntlTokenPw(""); setIntlTokenNew("") }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
