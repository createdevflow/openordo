"use client"

import React, { useState } from "react"
import { generateDemoCredentialsAction, sendDemoCredentialsEmailAction } from "@/server/actions/demo"
import { Play, Copy, ExternalLink, Clock, CheckCircle, Mail, ChevronDown, ChevronUp } from "lucide-react"

export function DemoRequestsClient({ initialRequests }: { initialRequests: any[] }) {
  const [requests, setRequests] = useState(initialRequests)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  async function handleGenerate(id: string) {
    setLoadingId(id)
    const res = await generateDemoCredentialsAction(id)
    if (res.success) {
      setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status: "CREDENTIALS_GENERATED", token: res.token } : r))
    } else {
      alert(res.error)
    }
    setLoadingId(null)
  }

  async function handleSend(id: string) {
    setLoadingId(id)
    const res = await sendDemoCredentialsEmailAction(id, window.location.origin)
    if (res.success) {
      alert("Email sent successfully!")
      setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status: "SENT" } : r))
    } else {
      alert(res.error)
    }
    setLoadingId(null)
  }

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div className="adm-container">
      <div className="adm-header">
        <div>
          <h1 className="adm-title">Demo Requests</h1>
          <p className="adm-subtitle">Manage incoming demo requests and send one-time sandbox access.</p>
        </div>
      </div>

      <div className="adm-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="adm-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Date</th>
              <th>Prospect</th>
              <th>Company</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--adm-ink-soft)" }}>No demo requests found.</td></tr>
            ) : requests.map((req) => (
              <React.Fragment key={req.id}>
                <tr>
                  <td>
                    <button className="adm-btn adm-btn-ghost" style={{ padding: 4 }} onClick={() => toggleExpand(req.id)}>
                      {expandedId === req.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </td>
                  <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{req.firstName} {req.lastName}</div>
                    <div style={{ fontSize: 12, color: "var(--adm-ink-soft)" }}>{req.email}</div>
                  </td>
                  <td>
                    <div>{req.companyName || "—"}</div>
                    <div style={{ fontSize: 12, color: "var(--adm-ink-soft)" }}>{req.employees} emp.</div>
                  </td>
                  <td>
                    <span className={`adm-badge ${req.status === "PENDING" ? "adm-badge-warning" : req.status === "CREDENTIALS_GENERATED" ? "adm-badge-info" : req.status === "SENT" ? "adm-badge-success" : req.status === "USED" ? "adm-badge-success" : "adm-badge-error"}`}>
                      {req.status.replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {req.status === "PENDING" && (
                      <button 
                        className="adm-btn adm-btn-primary adm-btn-sm" 
                        onClick={() => handleGenerate(req.id)}
                        disabled={loadingId === req.id}
                      >
                        {loadingId === req.id ? "Generating..." : "Generate Link"}
                      </button>
                    )}
                    {req.status === "CREDENTIALS_GENERATED" && req.token && (
                      <button 
                        className="adm-btn adm-btn-secondary adm-btn-sm" 
                        onClick={() => handleSend(req.id)}
                        disabled={loadingId === req.id}
                      >
                        <Mail size={14} style={{ marginRight: 6 }} /> {loadingId === req.id ? "Sending..." : "Send"}
                      </button>
                    )}
                    {req.status === "SENT" && req.token && (
                      <button 
                        className="adm-btn adm-btn-secondary adm-btn-sm" 
                        onClick={() => handleSend(req.id)}
                        disabled={loadingId === req.id}
                      >
                        <Mail size={14} style={{ marginRight: 6 }} /> {loadingId === req.id ? "Sending..." : "Resend"}
                      </button>
                    )}
                  </td>
                </tr>
                {expandedId === req.id && (
                  <tr style={{ background: "var(--adm-bg)" }}>
                    <td colSpan={6} style={{ padding: "16px 48px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--adm-muted)" }}>Job Title</p>
                          <p style={{ margin: 0, fontSize: 14 }}>{req.jobTitle || "—"}</p>
                        </div>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--adm-muted)" }}>Phone</p>
                          <p style={{ margin: 0, fontSize: 14 }}>{req.phone || "—"}</p>
                        </div>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--adm-muted)" }}>Country</p>
                          <p style={{ margin: 0, fontSize: 14 }}>{req.country || "—"}</p>
                        </div>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--adm-muted)" }}>Newsletter Opt-in</p>
                          <p style={{ margin: 0, fontSize: 14 }}>{req.newsletterOptIn ? "Yes" : "No"}</p>
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--adm-muted)" }}>Message</p>
                          <p style={{ margin: 0, fontSize: 14, whiteSpace: "pre-wrap" }}>{req.message || "—"}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
