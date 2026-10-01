"use client"

import { useState, useEffect } from "react"
import { AlertCircle, Terminal, Globe, User, Clock, ChevronDown, ChevronRight, Activity } from "lucide-react"

type SystemErrorLog = {
  id: string
  level: string
  source: string
  message: string
  stack: string | null
  url: string | null
  userId: string | null
  clinicId: string | null
  metadata: string | null
  createdAt: string
}

export function ObservabilityClient() {
  const [logs, setLogs] = useState<SystemErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      // Internal API endpoint to fetch logs for Super Admins
      const res = await fetch("/api/admin/observability-logs")
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="adm-card">
      <div className="adm-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="adm-card-title">
          <Activity size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "var(--adm-accent)" }} />
          System Error Logs
        </h2>
        <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={fetchLogs} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="adm-card-body p-0">
        {loading && logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--adm-muted)" }}>
            Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--adm-muted)" }}>
            <Activity size={40} style={{ margin: "0 auto 12px", opacity: 0.2 }} />
            No system errors logged yet.
          </div>
        ) : (
          <div style={{ borderTop: "1px solid var(--adm-border)" }}>
            {logs.map(log => (
              <div key={log.id} style={{ borderBottom: "1px solid var(--adm-border)", backgroundColor: expandedId === log.id ? "var(--adm-bg)" : "transparent" }}>
                <div 
                  style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <div style={{ width: 24, flexShrink: 0, color: "var(--adm-coral)" }}>
                    {expandedId === log.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--adm-coral)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {log.message}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--adm-muted)", marginTop: 4 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Terminal size={12} /> {log.source}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {expandedId === log.id && (
                  <div style={{ padding: "0 16px 16px 52px", fontSize: 13 }}>
                    <div style={{ backgroundColor: "rgba(0,0,0,0.02)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: 12, marginBottom: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
                        {log.url && (
                          <div>
                            <span style={{ color: "var(--adm-muted)", display: "block", fontSize: 11, marginBottom: 2 }}>URL</span>
                            <div style={{ wordBreak: "break-all" }}>{log.url}</div>
                          </div>
                        )}
                        {log.userId && (
                          <div>
                            <span style={{ color: "var(--adm-muted)", display: "block", fontSize: 11, marginBottom: 2 }}>User ID</span>
                            <div>{log.userId}</div>
                          </div>
                        )}
                        {log.clinicId && (
                          <div>
                            <span style={{ color: "var(--adm-muted)", display: "block", fontSize: 11, marginBottom: 2 }}>Clinic ID</span>
                            <div>{log.clinicId}</div>
                          </div>
                        )}
                      </div>
                      
                      {log.metadata && (
                        <div>
                          <span style={{ color: "var(--adm-muted)", display: "block", fontSize: 11, marginBottom: 4 }}>Metadata</span>
                          <pre style={{ margin: 0, padding: 8, backgroundColor: "#fff", border: "1px solid var(--adm-border)", borderRadius: 4, overflowX: "auto", fontSize: 11, fontFamily: "monospace" }}>
                            {log.metadata}
                          </pre>
                        </div>
                      )}
                    </div>
                    
                    {log.stack && (
                      <div>
                        <span style={{ color: "var(--adm-muted)", display: "block", fontSize: 11, marginBottom: 4, fontWeight: 500 }}>Stack Trace</span>
                        <pre style={{ margin: 0, padding: 12, backgroundColor: "#1e1e1e", color: "#d4d4d4", borderRadius: 6, overflowX: "auto", fontSize: 11, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                          {log.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
