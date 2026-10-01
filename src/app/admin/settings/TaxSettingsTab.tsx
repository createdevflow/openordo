"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { saveGlobalSettings, uploadBrandingAsset } from "@/server/actions/admin/global-settings"
import { getTaxCountryConfigs, createTaxCountryConfig, updateTaxCountryConfig, deleteTaxCountryConfig } from "@/server/actions/admin/tax-configs"
import * as Switch from "@radix-ui/react-switch"
import * as Dialog from "@radix-ui/react-dialog"
import { AlertTriangle, Upload, CheckCircle, Plus, Edit2, Trash2, X } from "lucide-react"

interface TaxSettingsTabProps {
  globalSettings: Record<string, string>
}

export function TaxSettingsTab({ globalSettings }: TaxSettingsTabProps) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [configs, setConfigs] = useState<any[]>([])
  const [loadingConfigs, setLoadingConfigs] = useState(true)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<any>(null)
  
  // Business Settings State
  const [settings, setSettings] = useState({
    GST_GSTIN: globalSettings.GST_GSTIN || "",
    GST_BUSINESS_NAME: globalSettings.GST_BUSINESS_NAME || "OpenORDO Technologies",
    GST_BUSINESS_ADDRESS: globalSettings.GST_BUSINESS_ADDRESS || "",
    GST_SUPPLIER_STATE: globalSettings.GST_SUPPLIER_STATE || "",
    GST_SAC_CODE: globalSettings.GST_SAC_CODE || "998314",
    GST_SIGNATORY_NAME: globalSettings.GST_SIGNATORY_NAME || "",
    GST_SIGNATORY_TITLE: globalSettings.GST_SIGNATORY_TITLE || "Authorized Signatory",
    GST_SIGNATURE_IMAGE_KEY: globalSettings.GST_SIGNATURE_IMAGE_KEY || "",
    GST_AUTO_GENERATE: globalSettings.GST_AUTO_GENERATE || "true",
  })

  // Country Form State
  const [formData, setFormData] = useState({
    countryCode: "",
    countryName: "",
    currencyBucket: "USD",
    taxLabel: "",
    taxIdLabel: "",
    calculationMode: "NONE",
    flatRate: "",
    ourRegisteredRegion: "",
    invoiceNumberPrefix: "",
    isActive: true,
    sortOrder: "0"
  })

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    setLoadingConfigs(true)
    const data = await getTaxCountryConfigs()
    setConfigs(data)
    setLoadingConfigs(false)
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    toast.promise(
      saveGlobalSettings(settings).then(res => {
        if ((res as any).error) throw new Error((res as any).error)
        return res
      }),
      {
        loading: "Saving business settings…",
        success: () => { setSaving(false); return "Business settings saved" },
        error: (err: any) => { setSaving(false); return err.message || "Failed to save" },
      }
    )
  }

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("key", "GST_SIGNATURE_IMAGE_KEY")
      const res = await uploadBrandingAsset(form)
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

  const openAddModal = () => {
    setEditingConfig(null)
    setFormData({
      countryCode: "",
      countryName: "",
      currencyBucket: "USD",
      taxLabel: "No Tax",
      taxIdLabel: "",
      calculationMode: "NONE",
      flatRate: "",
      ourRegisteredRegion: "",
      invoiceNumberPrefix: "",
      isActive: true,
      sortOrder: "0"
    })
    setIsModalOpen(true)
  }

  const openEditModal = (config: any) => {
    setEditingConfig(config)
    setFormData({
      countryCode: config.countryCode,
      countryName: config.countryName,
      currencyBucket: config.currencyBucket,
      taxLabel: config.taxLabel,
      taxIdLabel: config.taxIdLabel || "",
      calculationMode: config.calculationMode,
      flatRate: config.flatRate ? String(config.flatRate) : "",
      ourRegisteredRegion: config.ourRegisteredRegion || "",
      invoiceNumberPrefix: config.invoiceNumberPrefix || "",
      isActive: config.isActive,
      sortOrder: String(config.sortOrder)
    })
    setIsModalOpen(true)
  }

  const handleSaveConfig = async () => {
    const data = {
      ...formData,
      sortOrder: parseInt(formData.sortOrder) || 0,
      flatRate: formData.flatRate || null
    }

    try {
      if (editingConfig) {
        const res = await updateTaxCountryConfig(editingConfig.id, data)
        if (res.error) throw new Error(res.error)
        toast.success("Config updated")
      } else {
        const res = await createTaxCountryConfig(data)
        if (res.error) throw new Error(res.error)
        toast.success("Config created")
      }
      setIsModalOpen(false)
      fetchConfigs()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDeleteConfig = async (id: string) => {
    if (!confirm("Are you sure you want to delete this configuration?")) return
    try {
      const res = await deleteTaxCountryConfig(id)
      if (res.error) throw new Error(res.error)
      toast.success("Config deleted")
      fetchConfigs()
    } catch (err: any) {
      toast.error(err.message)
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
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: "var(--adm-text)" }}>
          Tax &amp; Invoicing
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--adm-text-muted)", lineHeight: 1.5 }}>
          Configure multi-country tax rules and OpenORDO's business details for automated invoicing.
        </p>
      </div>

      {/* Country Configs Section */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--adm-border)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--adm-text)", margin: 0 }}>
            Country Tax Configurations
          </h3>
          <button
            onClick={openAddModal}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6,
              background: "var(--adm-accent)", color: "white", fontSize: 13, fontWeight: 600,
              border: "none", cursor: "pointer"
            }}
          >
            <Plus size={14} /> Add Country
          </button>
        </div>

        {loadingConfigs ? (
          <p style={{ fontSize: 13, color: "var(--adm-text-muted)" }}>Loading configs...</p>
        ) : configs.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", background: "var(--adm-bg)", borderRadius: 8, border: "1px dashed var(--adm-border)" }}>
            <p style={{ fontSize: 13, color: "var(--adm-text-muted)", margin: 0 }}>No country configurations found.</p>
          </div>
        ) : (
          <div style={{ background: "var(--adm-card-bg)", borderRadius: 8, border: "1px solid var(--adm-border)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--adm-bg)", borderBottom: "1px solid var(--adm-border)", textAlign: "left" }}>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "var(--adm-text-muted)" }}>Country</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "var(--adm-text-muted)" }}>Label</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "var(--adm-text-muted)" }}>Mode</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "var(--adm-text-muted)" }}>Rate</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "var(--adm-text-muted)" }}>Status</th>
                  <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--adm-text-muted)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {configs.map(c => (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--adm-border)" }}>
                    <td style={{ padding: "12px 16px", color: "var(--adm-text)", fontWeight: 500 }}>
                      {c.countryName} ({c.countryCode})
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--adm-text)" }}>{c.taxLabel}</td>
                    <td style={{ padding: "12px 16px", color: "var(--adm-text-muted)" }}>
                      {c.calculationMode.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--adm-text)" }}>
                      {c.flatRate ? `${c.flatRate}%` : '-'}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ 
                        padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                        background: c.isActive ? "rgba(46, 107, 62, 0.1)" : "var(--adm-border)",
                        color: c.isActive ? "#2E6B3E" : "var(--adm-text-muted)"
                      }}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button onClick={() => openEditModal(c)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--adm-text-muted)", marginRight: 12 }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDeleteConfig(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#E05D52" }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Business Details Section */}
      <div style={{ maxWidth: 680 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "var(--adm-text)", paddingBottom: 8, borderBottom: "1px solid var(--adm-border)" }}>
          OpenORDO Business Profile
        </h3>
        
        {/* SAC code warning */}
        <div style={{
          display: "flex", gap: 10, padding: "12px 14px", borderRadius: 8, marginBottom: 24,
          background: "rgba(200, 134, 43, 0.08)", border: "1px solid rgba(200, 134, 43, 0.3)",
        }}>
          <AlertTriangle size={16} style={{ color: "#C8862B", flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 13, color: "#C8862B", lineHeight: 1.5, margin: 0 }}>
            <strong>Important:</strong> Ensure SAC codes and details match your registered business exactly.
          </p>
        </div>

        {field("GST_GSTIN", "Registered Tax ID (e.g. GSTIN/VAT Number)", "22AAAAA0000A1Z5", "Appears on invoices where applicable.")}
        {field("GST_BUSINESS_NAME", "Registered Business Name", "OpenORDO Technologies Pvt. Ltd.")}
        {field("GST_BUSINESS_ADDRESS", "Registered Business Address", "123, Tech Park, Sector 17…", "Full registered address including pin code.", "textarea")}
        {field("GST_SUPPLIER_STATE", "Supplier State/Region", "Chandigarh", "Used to determine tax splits for SPLIT_BY_SUPPLY_REGION mode.")}
        {field("GST_SAC_CODE", "SAC Code", "998314", "Service Accounting Code for the service type.")}

        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, marginTop: 32, color: "var(--adm-text)", paddingBottom: 8, borderBottom: "1px solid var(--adm-border)" }}>
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
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, marginTop: 32, color: "var(--adm-text)", paddingBottom: 8, borderBottom: "1px solid var(--adm-border)" }}>
          Generation Settings
        </h3>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 8, background: "var(--adm-bg)", border: "1px solid var(--adm-border)", marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--adm-text)" }}>
              Auto-generate on successful payment
            </p>
            <p style={{ fontSize: 13, color: "var(--adm-text-muted)", marginTop: 3 }}>
              Automatically create an invoice whenever a Plan or Plugin payment succeeds.
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

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          style={{
            padding: "10px 24px", borderRadius: 8, fontWeight: 700, fontSize: 14,
            background: saving ? "var(--adm-border)" : "var(--adm-accent)",
            color: "white", border: "none", cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving…" : "Save Business Profile"}
        </button>
      </div>

      {/* Modal for Country Config */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 }} />
          <Dialog.Content style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            background: "var(--adm-card-bg)", padding: 24, borderRadius: 12, width: "100%", maxWidth: 500,
            maxHeight: "90vh", overflowY: "auto", zIndex: 101, boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--adm-text)" }}>
                {editingConfig ? "Edit Country Config" : "Add Country Config"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--adm-text-muted)" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Country Code (ISO 2)</label>
                <input
                  type="text"
                  value={formData.countryCode}
                  onChange={e => setFormData(p => ({ ...p, countryCode: e.target.value.toUpperCase() }))}
                  placeholder="IN, US, GB"
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--adm-border)", background: "var(--adm-input-bg)", color: "var(--adm-text)" }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Country Name</label>
                <input
                  type="text"
                  value={formData.countryName}
                  onChange={e => setFormData(p => ({ ...p, countryName: e.target.value }))}
                  placeholder="India, United States"
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--adm-border)", background: "var(--adm-input-bg)", color: "var(--adm-text)" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Currency Bucket</label>
                <select
                  value={formData.currencyBucket}
                  onChange={e => setFormData(p => ({ ...p, currencyBucket: e.target.value }))}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--adm-border)", background: "var(--adm-input-bg)", color: "var(--adm-text)" }}
                >
                  <option value="USD">USD</option>
                  <option value="INR">INR</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Calculation Mode</label>
                <select
                  value={formData.calculationMode}
                  onChange={e => setFormData(p => ({ ...p, calculationMode: e.target.value }))}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--adm-border)", background: "var(--adm-input-bg)", color: "var(--adm-text)" }}
                >
                  <option value="NONE">None</option>
                  <option value="FLAT_PERCENTAGE">Flat Percentage</option>
                  <option value="SPLIT_BY_SUPPLY_REGION">Split by Supply Region</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Tax Label</label>
                <input
                  type="text"
                  value={formData.taxLabel}
                  onChange={e => setFormData(p => ({ ...p, taxLabel: e.target.value }))}
                  placeholder="GST, VAT, Sales Tax"
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--adm-border)", background: "var(--adm-input-bg)", color: "var(--adm-text)" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Tax ID Label (Optional)</label>
                <input
                  type="text"
                  value={formData.taxIdLabel}
                  onChange={e => setFormData(p => ({ ...p, taxIdLabel: e.target.value }))}
                  placeholder="GSTIN, VAT Number"
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--adm-border)", background: "var(--adm-input-bg)", color: "var(--adm-text)" }}
                />
              </div>

              {formData.calculationMode !== "NONE" && (
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Flat Rate (%)</label>
                  <input
                    type="number"
                    value={formData.flatRate}
                    onChange={e => setFormData(p => ({ ...p, flatRate: e.target.value }))}
                    placeholder="18"
                    style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--adm-border)", background: "var(--adm-input-bg)", color: "var(--adm-text)" }}
                  />
                </div>
              )}

              {formData.calculationMode === "SPLIT_BY_SUPPLY_REGION" && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Our Registered Region</label>
                  <input
                    type="text"
                    value={formData.ourRegisteredRegion}
                    onChange={e => setFormData(p => ({ ...p, ourRegisteredRegion: e.target.value }))}
                    placeholder="Chandigarh"
                    style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--adm-border)", background: "var(--adm-input-bg)", color: "var(--adm-text)" }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Invoice Prefix</label>
                <input
                  type="text"
                  value={formData.invoiceNumberPrefix}
                  onChange={e => setFormData(p => ({ ...p, invoiceNumberPrefix: e.target.value }))}
                  placeholder="OO-IN"
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--adm-border)", background: "var(--adm-input-bg)", color: "var(--adm-text)" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Sort Order</label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={e => setFormData(p => ({ ...p, sortOrder: e.target.value }))}
                  placeholder="0"
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--adm-border)", background: "var(--adm-input-bg)", color: "var(--adm-text)" }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                <Switch.Root
                  checked={formData.isActive}
                  onCheckedChange={v => setFormData(p => ({ ...p, isActive: v }))}
                  style={{
                    width: 42, height: 24, borderRadius: 12, cursor: "pointer",
                    background: formData.isActive ? "var(--adm-accent)" : "var(--adm-border)",
                    border: "none", outline: "none", position: "relative",
                  }}
                >
                  <Switch.Thumb style={{
                    display: "block", width: 18, height: 18, borderRadius: "50%",
                    background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                    transition: "transform 0.2s ease",
                    transform: formData.isActive ? "translateX(20px)" : "translateX(3px)",
                  }} />
                </Switch.Root>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Active (Available at onboarding)</span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32 }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ padding: "10px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "none", border: "1px solid var(--adm-border)", color: "var(--adm-text)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                style={{ padding: "10px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "var(--adm-accent)", color: "white", border: "none", cursor: "pointer" }}
              >
                Save Config
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
