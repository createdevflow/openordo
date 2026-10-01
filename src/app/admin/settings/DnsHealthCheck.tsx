"use client"

import { useState } from "react"
import { checkCustomDomainHealth } from "@/server/actions/dns"
import { Globe, CheckCircle2, XCircle, Loader2 } from "lucide-react"

export function DnsHealthCheck() {
  const [hostname, setHostname] = useState("")
  const [status, setStatus] = useState<"IDLE" | "LOADING" | "OK" | "PENDING" | "ERROR">("IDLE")
  const [message, setMessage] = useState("")
  const [records, setRecords] = useState<string[]>([])

  const handleCheck = async () => {
    if (!hostname) return
    setStatus("LOADING")
    setMessage("")
    setRecords([])

    try {
      const res = await checkCustomDomainHealth(hostname)
      setStatus(res.status)
      setMessage(res.message)
      if (res.recordsFound) setRecords(res.recordsFound)
    } catch (e: any) {
      setStatus("ERROR")
      setMessage(e.message || "An unexpected error occurred")
    }
  }

  return (
    <div style={{
      background: "var(--adm-bg)",
      border: "1px solid var(--adm-border)",
      borderRadius: 8,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 16
    }}>
      <div>
        <div className="adm-section-label" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
          <Globe size={14} /> Custom Domain DNS Health
        </div>
        <p style={{ fontSize: 13, color: "var(--adm-muted)", margin: 0 }}>
          Verify that a clinic's custom domain has a CNAME record correctly pointing to our infrastructure (<code>cname.openordo.com</code>).
        </p>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <input 
          className="adm-input" 
          placeholder="e.g. booking.drsmith.com" 
          value={hostname} 
          onChange={e => setHostname(e.target.value)}
          style={{ flex: 1 }}
          onKeyDown={e => e.key === "Enter" && handleCheck()}
        />
        <button 
          className="adm-btn adm-btn-primary"
          onClick={handleCheck}
          disabled={status === "LOADING" || !hostname}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          {status === "LOADING" ? <Loader2 size={14} className="animate-spin" /> : "Verify DNS"}
        </button>
      </div>

      {status !== "IDLE" && status !== "LOADING" && (
        <div style={{
          background: status === "OK" ? "rgba(30,70,56,0.06)" : status === "PENDING" ? "#fffbeb" : "#fef2f2",
          border: `1px solid ${status === "OK" ? "rgba(30,70,56,0.15)" : status === "PENDING" ? "#fcd34d" : "#fecaca"}`,
          borderRadius: 6,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {status === "OK" ? <CheckCircle2 size={16} color="var(--adm-accent)" /> : <XCircle size={16} color={status === "PENDING" ? "#d97706" : "#dc2626"} />}
            <span style={{ fontSize: 13.5, fontWeight: 600, color: status === "OK" ? "var(--adm-accent)" : status === "PENDING" ? "#b45309" : "#991b1b" }}>
              {message}
            </span>
          </div>
          
          {records.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--adm-text)", background: "rgba(255,255,255,0.6)", padding: 8, borderRadius: 4, fontFamily: "monospace" }}>
              <strong>Found CNAME target(s):</strong> {records.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
