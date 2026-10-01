"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { revealGlobalSetting } from "@/server/actions/admin/global-settings"
import { toast } from "sonner"
import * as Dialog from "@radix-ui/react-dialog"

export function EncryptedField({ 
  label, 
  value, 
  onChange, 
  placeholder,
  settingKey 
}: { 
  label: string, 
  value: string, 
  onChange: (v: string) => void,
  placeholder?: string,
  settingKey: string
}) {
  const [showModal, setShowModal] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [revealedValue, setRevealedValue] = useState<string | null>(null)
  
  const isMasked = value.includes("••••")

  const handleReveal = async () => {
    setLoading(true)
    try {
      const res = await revealGlobalSetting(settingKey, adminPassword)
      if (res.ok && res.value) {
        setRevealedValue(res.value)
        setShowModal(false)
        setAdminPassword("")
      } else {
        toast.error(res.error || "Failed to reveal")
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to reveal")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <label className="adm-label">{label}</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input 
          className="adm-input" 
          type="text" 
          value={revealedValue !== null ? revealedValue : value} 
          onChange={e => {
            if (revealedValue !== null) setRevealedValue(null)
            onChange(e.target.value)
          }} 
          placeholder={placeholder}
          style={{ flex: 1, fontFamily: isMasked && revealedValue === null ? "monospace" : "inherit" }}
        />
        {isMasked && revealedValue === null && (
          <button 
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-icon"
            onClick={() => setShowModal(true)}
            title="Reveal Token"
          >
            <Eye size={16} />
          </button>
        )}
        {revealedValue !== null && (
          <button 
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-icon"
            onClick={() => setRevealedValue(null)}
            title="Hide Token"
          >
            <EyeOff size={16} />
          </button>
        )}
      </div>

      <Dialog.Root open={showModal} onOpenChange={setShowModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--adm-ink)", margin: 0 }}>Security Check</h3>
              <p style={{ fontSize: 13, color: "var(--adm-muted)", margin: "4px 0 0 0" }}>Enter your admin password to reveal this credential.</p>
            </div>
            
            <input
              type="password"
              className="adm-input"
              autoFocus
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Admin password"
              onKeyDown={(e) => e.key === "Enter" && handleReveal()}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
              <button className="adm-btn adm-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button 
                className="adm-btn adm-btn-primary" 
                onClick={handleReveal}
                disabled={!adminPassword || loading}
              >
                {loading ? "Verifying..." : "Reveal"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
