"use client"

import React, { useState } from "react"
import { generateDemoCredentialsAction, sendDemoCredentialsEmailAction } from "@/server/actions/demo"
import { Play, Copy, ExternalLink, Clock, CheckCircle, Mail, ChevronDown, ChevronUp, Search } from "lucide-react"
import { AdminPagination, paginateData } from "@/components/ui/AdminPagination"

export function DemoRequestsClient({ initialRequests }: { initialRequests: any[] }) {
  const [requests, setRequests] = useState(initialRequests)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  async function handleGenerate(id: string) {
    setLoadingId(id)
    const res = await generateDemoCredentialsAction(id)
    if ("error" in res && res.error) {
      alert(res.error)
    } else if ("token" in res) {
      setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status: "CREDENTIALS_GENERATED", token: res.token } : r))
    }
    setLoadingId(null)
  }

  async function handleSend(id: string) {
    setLoadingId(id)
    const res = await sendDemoCredentialsEmailAction(id, window.location.origin)
    if ("error" in res && res.error) {
      alert(res.error)
    } else {
      alert("Email sent successfully!")
      setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status: "SENT" } : r))
    }
    setLoadingId(null)
  }

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id)
  }

  const filtered = requests.filter((r) => {
    const term = search.toLowerCase()
    const fullName = `${r.firstName || ""} ${r.lastName || ""}`.toLowerCase()
    const matchSearch =
      fullName.includes(term) ||
      r.email?.toLowerCase().includes(term) ||
      r.companyName?.toLowerCase().includes(term) ||
      r.jobTitle?.toLowerCase().includes(term)
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter
    return matchSearch && matchStatus
  })

  const paginated = paginateData(filtered, page, pageSize)

  const handleSearch = (val: string) => { setSearch(val); setPage(1) }
  const handleStatusFilter = (val: string) => { setStatusFilter(val); setPage(1) }

  return (
    <div className="adm-container">
      <div className="adm-header">
        <div>
          <h1 className="adm-title">Demo Requests</h1>
          <p className="adm-subtitle">Manage incoming demo requests and send one-time sandbox access.</p>
        </div>
      </div>

      <div className="adm-filters-bar" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--adm-muted)" }} />
          <input
            type="text"
            className="adm-input"
            style={{ paddingLeft: 34, width: "100%" }}
            placeholder="Search by prospect name, email, or company..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <select
          className="adm-select"
          style={{ width: "auto", minWidth: 150 }}
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CREDENTIALS_GENERATED">Credentials Ready</option>
          <option value="SENT">Sent</option>
          <option value="USED">Used</option>
        </select>
      </div>

      <div className="adm-card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div className="adm-empty" style={{ padding: 40, textAlign: "center" }}>
            <div className="adm-empty-title">{requests.length === 0 ? "No demo requests found" : "No matches found"}</div>
            <div className="adm-empty-desc">
              {requests.length === 0 ? "When prospects request a demo on the website, they will appear here." : "Try adjusting your search criteria."}
            </div>
          </div>
        ) : (
          <>
            <div className="adm-table-wrap">
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
                  {paginated.map((req) => (
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
                          <div style={{ fontSize: 12, color: "var(--adm-ink-soft)" }}>{req.employees || "—"} emp.</div>
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
                          <td colSpan={6} style={{ padding: "16px 24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
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
            <AdminPagination
              totalItems={filtered.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(sz) => { setPageSize(sz); setPage(1) }}
            />
          </>
        )}
      </div>
    </div>
  )
}
