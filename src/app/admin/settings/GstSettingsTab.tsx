"use client"

/**
 * GstSettingsTab — CHARTWELL_PRELAUNCH_OPS_SPEC.md §3.3
 *
 * Admin panel for configuring OpenORDO's own GST invoicing settings.
 * Lives alongside the BAA Settings tab in Settings → Control Center.
 */

import { useState } from "react"
import { toast } from "sonner"
import { saveGlobalSettings, uploadBrandingAsset } from "@/server/actions/admin/global-settings"
import * as Switch from "@radix-ui/react-switch"
import { AlertTriangle, Upload, FileText, CheckCircle } from "lucide-react"

interface GstSettingsTabProps {
  globalSettings: Record<string, string>
}

export function GstSettingsTab({ globalSettings }: GstSettingsTabProps) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [settings, setSettings] = useState({
    GST_GSTIN: globalSettings.GST_GSTIN || "",
    GST_BUSINESS_NAME: globalSettings.GST_BUSINESS_NAME || "OpenORDO Technologies",
    GST_BUSINESS_ADDRESS: globalSettings.GST_BUSINESS_ADDRESS || "",
    GST_SUPPLIER_STATE: globalSettings.GST_SUPPLIER_STATE || "",
    GST_SAC_CODE: globalSettings.GST_SAC_CODE || "998314",
    GST_INVOICE_PREFIX: globalSettings.GST_INVOICE_PREFIX || "OO",
    GST_SIGNATORY_NAME: globalSettings.GST_SIGNATORY_NAME || "",
    GST_SIGNATORY_TITLE: globalSettings.GST_SIGNATORY_TITLE || "Authorized Signatory",
    GST_SIGNATURE_IMAGE_KEY: globalSettings.GST_SIGNATURE_IMAGE_KEY || "",
    GST_AUTO_GENERATE: globalSettings.GST_AUTO_GENERATE || "true",
    PLATFORM_FEE_PERCENTAGE: globalSettings.PLATFORM_FEE_PERCENTAGE || "10",
  })

  const handleSave = async () => {
    setSaving(true)
    toast.promise(
      saveGlobalSettings(settings).then(res => {
        if ((res as any).error) throw new Error((res as any).error)
        return res
      }),
      {
        loading: "Saving GST settings…",
        success: () => { setSaving(false); return "GST settings saved" },
        error: (err: any) => { setSaving(false); return err.message || "Failed to save" },
      }
    )
  }

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("key", "GST_SIGNATURE_IMAGE_KEY")
      const res = await uploadBrandingAsset(formData)
      if (res.success) {
        setSettings(prev => ({ ...prev, GST_SIGNATURE_IMAGE_KEY: (res as any).fileKey || "" }))
        toast.success("Signature uploaded")
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const field = (
    key: keyof typeof settings,
    label: string,
    placeholder?: string,
    hint?: string,
    type: "text" | "textarea" = "text"
  ) => (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--adm-text-muted)" }}>
        {label}
      </label>
      {type === "textarea" ? (
        <textarea
          value={settings[key]}
          onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
          placeholder={placeholder}
          rows={3}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 14,
            border: "1px solid var(--adm-border)", background: "var(--adm-input-bg)",
            color: "var(--adm-text)", outline: "none", resize: "vertical", lineHeight: 1.5,
          }}
        />
      ) : (
        <input
          type="text"
          value={settings[key]}
          onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
          placeholder={placeholder}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 14,
            border: "1px solid var(--adm-border)", background: "var(--adm-input-bg)",
            color: "var(--adm-text)", outline: "none",
          }}
        />
      )}
      {hint && (
        <p style={{ fontSize: 12, color: "var(--adm-text-muted)", marginTop: 5, lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  )

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: "var(--adm-text)" }}>
          Invoicing &amp; GST Settings
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--adm-text-muted)", lineHeight: 1.5 }}>
          Configure OpenORDO's own GST details for billing clinics. Invoices are generated
          automatically on every successful Plan or Plugin payment.
        </p>
      </div>

      {/* SAC code warning */}
      <div style={{
        display: "flex", gap: 10, padding: "12px 14px", borderRadius: 8, marginBottom: 24,
        background: "rgba(200, 134, 43, 0.08)", border: "1px solid rgba(200, 134, 43, 0.3)",
      }}>
        <AlertTriangle size={16} style={{ color: "#C8862B", flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 13, color: "#C8862B", lineHeight: 1.5, margin: 0 }}>
          <strong>Important:</strong> The SAC code pre-filled below (998314) is a common code for IT services.
          Confirm the exact code with a CA/accountant before going live — the correct classification depends
          on the specific nature of the service.
        </p>
      </div>

      {/* Section: Business Details */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "var(--adm-text)", paddingBottom: 8, borderBottom: "1px solid var(--adm-border)" }}>
          Business &amp; GST Details
        </h3>

        {field("GST_GSTIN", "GSTIN (GST Registration Number)", "22AAAAA0000A1Z5",
          "OpenORDO's registered GST number. Appears on every tax invoice.")}
        {field("GST_BUSINESS_NAME", "Registered Business Name", "OpenORDO Technologies Pvt. Ltd.")}
        {field("GST_BUSINESS_ADDRESS", "Registered Business Address", "123, Tech Park, Sector 17…",
          "Full registered address including pin code.", "textarea")}
        {field("GST_SUPPLIER_STATE", "Supplier State (OpenORDO's registered state)", "Chandigarh",
          "Used to determine CGST+SGST (intra-state) vs IGST (inter-state) per invoice.")}
        {field("GST_SAC_CODE", "SAC Code",  "998314",
          "Service Accounting Code for the service type. Verify with your CA.")}
      </div>

      {/* Section: Invoice Numbering */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "var(--adm-text)", paddingBottom: 8, borderBottom: "1px solid var(--adm-border)" }}>
          Invoice Numbering
        </h3>

        {field("GST_INVOICE_PREFIX", "Invoice Number Prefix", "OO",
          "Format: PREFIX/YYYY-YY/000001. Default: OO (OpenORDO).")}

        <div style={{ padding: "12px 14px", background: "var(--adm-bg)", borderRadius: 8, border: "1px solid var(--adm-border)" }}>
          <p style={{ fontSize: 13, color: "var(--adm-text-muted)", margin: 0, lineHeight: 1.5 }}>
            <strong style={{ color: "var(--adm-text)" }}>Sequential &amp; financial-year-scoped</strong><br />
            Invoice numbers are atomically incremented and scoped to India's financial year (April–March).
            A number is never reused or deleted — voided invoices receive a documented cancellation record.
          </p>
        </div>
      </div>

      {/* Section: Authorized Signatory */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "var(--adm-text)", paddingBottom: 8, borderBottom: "1px solid var(--adm-border)" }}>
          Authorized Signatory
        </h3>

        {field("GST_SIGNATORY_NAME", "Signatory Full Name", "Rahul Sharma")}
        {field("GST_SIGNATORY_TITLE", "Signatory Title", "Authorized Signatory / Director")}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--adm-text-muted)" }}>
            Signature Image
          </label>
          {settings.GST_SIGNATURE_IMAGE_KEY ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <CheckCircle size={16} style={{ color: "#2E6B3E" }} />
              <span style={{ fontSize: 13, color: "var(--adm-text)" }}>Signature uploaded</span>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--adm-text-muted)", marginBottom: 8 }}>
              No signature uploaded yet. Upload a transparent PNG or JPG (max 2MB).
            </p>
          )}
          <label style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "8px 14px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600,
            border: "1px solid var(--adm-border)", background: "var(--adm-card-bg)", color: "var(--adm-text)",
          }}>
            <Upload size={14} />
            {uploading ? "Uploading…" : settings.GST_SIGNATURE_IMAGE_KEY ? "Replace signature" : "Upload signature"}
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleSignatureUpload} disabled={uploading} />
          </label>
          <p style={{ fontSize: 12, color: "var(--adm-text-muted)", marginTop: 6 }}>
            Same private-storage pattern as the BAA — never publicly accessible.
          </p>
        </div>
      </div>

      {/* Section: Pricing & Fees */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "var(--adm-text)", paddingBottom: 8, borderBottom: "1px solid var(--adm-border)" }}>
          Pricing &amp; Fees
        </h3>

        {field("PLATFORM_FEE_PERCENTAGE", "Platform Fee Percentage (%)", "10",
          "The percentage of the transaction taken as platform fee (e.g., '10'). This fee will be explicitly mentioned on invoices and applied to purchases.")}
      </div>

      {/* Section: Auto-generate toggle */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "var(--adm-text)", paddingBottom: 8, borderBottom: "1px solid var(--adm-border)" }}>
          Generation Settings
        </h3>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 8, background: "var(--adm-bg)", border: "1px solid var(--adm-border)" }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--adm-text)" }}>
              Auto-generate on successful payment
            </p>
            <p style={{ fontSize: 13, color: "var(--adm-text-muted)", marginTop: 3 }}>
              Automatically create a GST invoice whenever a Plan or Plugin payment succeeds.
            </p>
          </div>
          <Switch.Root
            checked={settings.GST_AUTO_GENERATE === "true"}
            onCheckedChange={v => setSettings(prev => ({ ...prev, GST_AUTO_GENERATE: v ? "true" : "false" }))}
            style={{
              width: 42, height: 24, borderRadius: 12, cursor: "pointer",
              background: settings.GST_AUTO_GENERATE === "true" ? "var(--adm-accent)" : "var(--adm-border)",
              border: "none", outline: "none", position: "relative", flexShrink: 0,
            }}
          >
            <Switch.Thumb style={{
              display: "block", width: 18, height: 18, borderRadius: "50%",
              background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
              transition: "transform 0.2s ease",
              transform: settings.GST_AUTO_GENERATE === "true" ? "translateX(20px)" : "translateX(3px)",
            }} />
          </Switch.Root>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "10px 24px", borderRadius: 8, fontWeight: 700, fontSize: 14,
          background: saving ? "var(--adm-border)" : "var(--adm-accent)",
          color: "white", border: "none", cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Saving…" : "Save GST Settings"}
      </button>
    </div>
  )
}
