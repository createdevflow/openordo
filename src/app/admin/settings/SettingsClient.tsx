"use client"

import { useState, useTransition } from "react"
import { Settings, Shield, Key, Mail, User, CheckCircle } from "lucide-react"
import { updateAdminCredentialsAction, updateGlobalSettingAction } from "@/server/actions/admin/settings"
import { toast } from "sonner"

export function SettingsClient({ admin, demoVideoUrl = "" }: { admin: any; demoVideoUrl?: string }) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null)
  const [videoUrl, setVideoUrl] = useState(demoVideoUrl)
  
  const handleSaveVideo = () => {
    startTransition(async () => {
      toast.promise(
        updateGlobalSettingAction("demo_video_url", videoUrl).then((res) => {
          if (!res.ok) throw new Error(res.error)
          return res
        }),
        {
          loading: "Saving...",
          success: "Marketing settings updated",
          error: (err) => err.message || "Failed to update",
        }
      )
    })
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setResult(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      toast.promise(
        updateAdminCredentialsAction(formData).then((res) => {
          if (!res.ok) throw new Error(res.error)
          setResult(res as any)
          return res
        }),
        {
          loading: "Saving...",
          success: "Admin credentials updated",
          error: (err) => err.message || "Failed to update",
        }
      )
    })
  }

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Settings size={22} /> Settings
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24, alignItems: "start" }}>
        {/* Left: Admin Info Card */}
        <div className="adm-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--adm-accent-soft)", border: "2px solid rgba(79,110,247,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "var(--adm-accent)" }}>
              {admin?.name?.charAt(0) || "A"}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{admin?.name}</div>
              <div style={{ fontSize: 13, color: "var(--adm-soft)", marginTop: 4 }}>{admin?.email}</div>
            </div>
            <div className="adm-badge adm-badge-blue" style={{ marginTop: 4 }}>
              <Shield size={11} /> Super Admin
            </div>
            <div style={{ width: "100%", borderTop: "1px solid var(--adm-border)", paddingTop: 14, marginTop: 4 }}>
              <div style={{ fontSize: 12, color: "var(--adm-soft)" }}>
                Account since<br />
                <strong style={{ color: "var(--adm-text)" }}>
                  {admin?.createdAt ? new Date(admin.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Credential Update Form */}
        <div className="adm-card">
          <div className="adm-card-head">
            <div className="adm-card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Key size={16} /> Update Admin Credentials
            </div>
          </div>
          <div style={{ padding: 24 }}>
            {result?.error && (
              <div className="adm-alert adm-alert-error">
                {result.error}
              </div>
            )}
            {result?.success && (
              <div className="adm-alert adm-alert-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={15} /> Credentials updated successfully.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="adm-form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="adm-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Mail size={12} /> New Email Address
                  </label>
                  <input
                    className="adm-input"
                    type="email"
                    name="email"
                    defaultValue={admin?.email}
                    placeholder="admin@citc.biz"
                  />
                  <div style={{ fontSize: 12, color: "var(--adm-soft)", marginTop: 6 }}>Leave unchanged to keep current email.</div>
                </div>

                <div className="adm-form-group">
                  <label className="adm-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Key size={12} /> New Password
                  </label>
                  <input
                    className="adm-input"
                    type="password"
                    name="password"
                    placeholder="Leave blank to keep current"
                    autoComplete="new-password"
                  />
                </div>

                <div className="adm-form-group">
                  <label className="adm-label">Confirm New Password</label>
                  <input
                    className="adm-input"
                    type="password"
                    name="confirmPassword"
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                  />
                </div>

                <div className="adm-form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="adm-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <User size={12} /> Current Password <span style={{ color: "var(--adm-danger)", marginLeft: 2 }}>*</span>
                  </label>
                  <input
                    className="adm-input"
                    type="password"
                    name="currentPassword"
                    placeholder="Required to save any changes"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="submit"
                  className="adm-btn adm-btn-primary"
                  disabled={isPending}
                >
                  {isPending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>


          <div className="adm-card" style={{ padding: 24, marginTop: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Marketing & Content</h2>
            <p style={{ fontSize: 14, color: "var(--adm-soft)", marginBottom: 20 }}>Configure assets for the public marketing site.</p>
            
            <div className="adm-form-group">
              <label className="adm-label">Demo Video URL (YouTube Embed or direct URL)</label>
              <input
                className="adm-input"
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                className="adm-btn adm-btn-primary"
                onClick={handleSaveVideo}
                disabled={isPending}
              >
                {isPending ? "Saving…" : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
