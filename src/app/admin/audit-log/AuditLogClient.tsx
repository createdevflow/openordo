"use client"

import { useState } from "react"
import { ShieldCheck, Search, ChevronDown, ChevronRight } from "lucide-react"

const ACTION_TONES: Record<string, string> = {
  SUSPEND_CLINIC: "adm-badge-red",
  REACTIVATE_CLINIC: "adm-badge-green",
  DELETE_CLINIC: "adm-badge-red",
  CHANGE_PLAN: "adm-badge-blue",
  GRANT_PROMO: "adm-badge-green",
  CREATE_PLAN: "adm-badge-forest",
  UPDATE_PLAN: "adm-badge-blue",
  ARCHIVE_PLAN: "adm-badge-amber",
  CREATE_PROMO: "adm-badge-forest",
  PAUSE_PROMO: "adm-badge-amber",
  RESUME_PROMO: "adm-badge-green",
  END_PROMO: "adm-badge-red",
  PROMOTE_USER: "adm-badge-forest",
  DEMOTE_USER: "adm-badge-amber",
  DEACTIVATE_USER: "adm-badge-red",
  TOGGLE_FLAG: "adm-badge-blue",
  TOGGLE_FEATURE: "adm-badge-blue",
  DELETE_FEATURE: "adm-badge-red",
  CREATE_FEATURE: "adm-badge-forest",
}

export function AuditLogClient({ logs }: { logs: any[] }) {
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = logs.filter(l =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.targetType.toLowerCase().includes(search.toLowerCase()) ||
    l.targetId.toLowerCase().includes(search.toLowerCase()) ||
    l.actorUserId.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ShieldCheck size={22} /> Audit Log
          <span className="adm-badge adm-badge-gray">{logs.length}</span>
        </h1>
        <div style={{ fontSize: 13, color: "var(--adm-muted)" }}>
          Every admin action, immutable record
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-filter-row">
          <Search size={14} color="var(--adm-muted)" />
          <input
            className="adm-search-input"
            placeholder="Filter by action, target type, actor…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-icon"><ShieldCheck size={24} /></div>
            <div className="adm-empty-title">No audit events yet</div>
            <div className="adm-empty-desc">All Super Admin actions appear here automatically.</div>
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Actor</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log: any) => (
                  <>
                    <tr
                      key={log.id}
                      style={{ cursor: log.metadata ? "pointer" : "default" }}
                      onClick={() => log.metadata && setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <td style={{ width: 28, paddingRight: 0 }}>
                        {log.metadata && (
                          expandedId === log.id
                            ? <ChevronDown size={14} color="var(--adm-muted)" />
                            : <ChevronRight size={14} color="var(--adm-muted)" />
                        )}
                      </td>
                      <td>
                        <span className={`adm-badge ${ACTION_TONES[log.action] || "adm-badge-gray"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{log.targetType}</div>
                        <div style={{ fontSize: 12, color: "var(--adm-muted)" }} className="adm-mono">{log.targetId}</div>
                      </td>
                      <td className="adm-mono" style={{ fontSize: 12, color: "var(--adm-muted)" }}>
                        {log.actorUserId.slice(0, 12)}…
                      </td>
                      <td className="adm-mono" style={{ fontSize: 12.5, color: "var(--adm-muted)", whiteSpace: "nowrap" }}>
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                      </td>
                    </tr>
                    {expandedId === log.id && log.metadata && (
                      <tr key={`${log.id}-exp`}>
                        <td colSpan={5} style={{ background: "var(--adm-bg)", padding: "12px 20px 12px 48px" }}>
                          <pre style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12.5, margin: 0, color: "var(--adm-text)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                            {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
