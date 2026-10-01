"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { uploadBrandingAsset, saveGlobalSettings } from "@/server/actions/admin/global-settings"
import { publishBaaTemplateVersion } from "@/server/actions/admin/baa-settings"
import * as Switch from "@radix-ui/react-switch"

export function BaaSettingsTab({ 
  globalSettings, 
  baaTemplateVersions 
}: { 
  globalSettings: Record<string, string>
  baaTemplateVersions: any[] 
}) {
  const { confirm } = useConfirm()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const currentVersion = baaTemplateVersions.find(v => v.isCurrent)

  const [settings, setSettings] = useState({
    BAA_SIGNATORY_NAME: globalSettings.BAA_SIGNATORY_NAME || "",
    BAA_SIGNATORY_TITLE: globalSettings.BAA_SIGNATORY_TITLE || "",
    BAA_COMPANY_DETAILS: globalSettings.BAA_COMPANY_DETAILS || "OpenORDO\nChandigarh, India",
    BAA_AUTO_SEND: globalSettings.BAA_AUTO_SEND || "false",
    BAA_SIGNATURE_IMAGE_KEY: globalSettings.BAA_SIGNATURE_IMAGE_KEY || "",
  })
  
  const [newTemplateBody, setNewTemplateBody] = useState(currentVersion?.bodyText || "")

  const handleSaveSettings = async () => {
    setSaving(true)
    toast.promise(saveGlobalSettings(settings), {
      loading: "Saving BAA settings...",
      success: () => { setSaving(false); return "Settings saved" },
      error: () => { setSaving(false); return "Failed to save settings" }
    })
  }

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)
    formData.append("key", "BAA_SIGNATURE_IMAGE_KEY")

    setUploading(true)
    try {
      const res = await uploadBrandingAsset(formData)
      if (res.success && res.url) {
        setSettings(p => ({ ...p, BAA_SIGNATURE_IMAGE_KEY: res.url }))
        toast.success("Signature image uploaded")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload signature")
    } finally {
      setUploading(false)
    }
  }

  const handlePublishTemplate = async () => {
    if (newTemplateBody === currentVersion?.bodyText) {
      toast.info("No changes to publish.")
      return
    }

    const ok = await confirm({
      title: "Publish new BAA version?",
      body: "This will create a new version of the BAA template. It will apply to all future BAA requests, but will not affect existing approved BAAs.",
      confirmLabel: "Publish new version",
      tone: "primary"
    })

    if (!ok) return

    toast.promise(publishBaaTemplateVersion(newTemplateBody), {
      loading: "Publishing...",
      success: "New BAA version published",
      error: "Failed to publish"
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <div className="adm-section-label" style={{ marginBottom: 16 }}>Signatory & Execution Details</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 }}>
          <div>
            <label className="adm-label">Authorized Signatory Name</label>
            <input 
              className="adm-input" 
              value={settings.BAA_SIGNATORY_NAME} 
              onChange={e => setSettings(p => ({ ...p, BAA_SIGNATORY_NAME: e.target.value }))} 
              placeholder="e.g. Jane Doe"
            />
          </div>
          <div>
            <label className="adm-label">Authorized Signatory Title</label>
            <input 
              className="adm-input" 
              value={settings.BAA_SIGNATORY_TITLE} 
              onChange={e => setSettings(p => ({ ...p, BAA_SIGNATORY_TITLE: e.target.value }))} 
              placeholder="e.g. Founder"
            />
          </div>
          <div>
            <label className="adm-label">Signature Image (PNG with transparency recommended)</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {settings.BAA_SIGNATURE_IMAGE_KEY && (
                <div style={{ padding: 12, border: "1px solid var(--adm-border)", borderRadius: 8, background: "#fff", display: "inline-block", alignSelf: "flex-start" }}>
                  <img src={settings.BAA_SIGNATURE_IMAGE_KEY} alt="Signature" style={{ maxHeight: 60, objectFit: "contain" }} />
                </div>
              )}
              <input 
                className="adm-input" 
                type="file" 
                accept="image/png, image/jpeg" 
                onChange={handleSignatureUpload} 
                disabled={uploading} 
              />
            </div>
            <p style={{ fontSize: 12.5, color: "var(--adm-muted)", marginTop: 6 }}>This signature will be embedded in the PDF's execution block. (Never exposed as a public URL)</p>
          </div>
          <div>
            <label className="adm-label">Company Details Block</label>
            <textarea 
              className="adm-input" 
              rows={3} 
              value={settings.BAA_COMPANY_DETAILS} 
              onChange={e => setSettings(p => ({ ...p, BAA_COMPANY_DETAILS: e.target.value }))} 
              placeholder="OpenORDO\nChandigarh, India"
            />
          </div>
          <button className="adm-btn adm-btn-primary" style={{ alignSelf: "flex-start" }} onClick={handleSaveSettings} disabled={saving}>
            {saving ? "Saving..." : "Save Details"}
          </button>
        </div>
      </div>

      <hr style={{ border: 0, borderTop: "1px solid var(--adm-border)" }} />

      <div>
        <div className="adm-section-label" style={{ marginBottom: 16 }}>Delivery Settings</div>
        <div className="adm-toggle-row" style={{ maxWidth: 520 }}>
          <div className="adm-toggle-info">
            <div className="adm-toggle-label">Auto-send on approval</div>
            <div className="adm-toggle-desc">When on, approving a request immediately emails the finalized PDF to the requesting Owner.</div>
          </div>
          <Switch.Root
            checked={settings.BAA_AUTO_SEND === "true"}
            onCheckedChange={val => setSettings(p => ({ ...p, BAA_AUTO_SEND: val ? "true" : "false" }))}
          >
            <Switch.Thumb />
          </Switch.Root>
        </div>
        <button className="adm-btn adm-btn-primary" style={{ alignSelf: "flex-start", marginTop: 16 }} onClick={handleSaveSettings} disabled={saving}>
            {saving ? "Saving..." : "Save Delivery Settings"}
        </button>
      </div>

      <hr style={{ border: 0, borderTop: "1px solid var(--adm-border)" }} />

      <div>
        <div className="adm-section-label" style={{ marginBottom: 16 }}>Template Management</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="adm-label">Current BAA Legal Text ({currentVersion?.versionLabel || "None"})</label>
            <textarea 
              className="adm-input" 
              rows={15} 
              value={newTemplateBody} 
              onChange={e => setNewTemplateBody(e.target.value)} 
              style={{ fontFamily: "monospace", fontSize: 12 }}
            />
            <p style={{ fontSize: 12.5, color: "var(--adm-muted)", marginTop: 6 }}>
              You can edit the wording above. Click "Publish new version" to apply it to all future requests.
            </p>
          </div>
          <button className="adm-btn adm-btn-primary" style={{ alignSelf: "flex-start" }} onClick={handlePublishTemplate}>
            Publish new version
          </button>
        </div>
        
        <div style={{ marginTop: 24 }}>
          <h4 style={{ fontSize: 13.5, fontWeight: 600, color: "var(--adm-text)", marginBottom: 12 }}>Version History</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 520 }}>
            {baaTemplateVersions.map(v => (
              <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid var(--adm-border)", borderRadius: 6, background: v.isCurrent ? "var(--adm-hover)" : "transparent" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--adm-text)" }}>{v.versionLabel} {v.isCurrent && <span style={{ fontSize: 11, background: "var(--adm-primary)", color: "#fff", padding: "2px 6px", borderRadius: 4, marginLeft: 8 }}>CURRENT</span>}</div>
                  <div style={{ fontSize: 12, color: "var(--adm-muted)", marginTop: 2 }}>Published {new Date(v.publishedAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
            {baaTemplateVersions.length === 0 && <div style={{ fontSize: 13, color: "var(--adm-muted)" }}>No versions published yet.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
