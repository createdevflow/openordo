"use client"

import { useState } from "react"
import { Search, Mail, MessageSquare, Clock } from "lucide-react"
import { AdminPagination, paginateData } from "@/components/ui/AdminPagination"

interface Lead {
  id: string
  name: string
  email: string
  message: string
  status: string
  createdAt: string | Date
}

export function LeadsClient({ leads }: { leads: Lead[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const filtered = leads.filter((lead) => {
    const term = search.toLowerCase()
    const matchSearch =
      lead.name?.toLowerCase().includes(term) ||
      lead.email?.toLowerCase().includes(term) ||
      lead.message?.toLowerCase().includes(term)
    const matchStatus = statusFilter === "ALL" || lead.status === statusFilter
    return matchSearch && matchStatus
  })

  const paginated = paginateData(filtered, page, pageSize)

  const handleSearch = (val: string) => { setSearch(val); setPage(1) }
  const handleStatusFilter = (val: string) => { setStatusFilter(val); setPage(1) }

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1 className="adm-page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MessageSquare size={22} /> Contact Leads
            <span className="adm-badge adm-badge-gray">{leads.length}</span>
          </h1>
          <span style={{ fontSize: 13, color: "var(--adm-muted)" }}>Manage incoming website inquiries and sales leads</span>
        </div>
      </div>

      <div className="adm-filters-bar" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--adm-muted)" }} />
          <input
            type="text"
            className="adm-input"
            style={{ paddingLeft: 34, width: "100%" }}
            placeholder="Search leads by name, email, or message..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <select
          className="adm-select"
          style={{ width: "auto", minWidth: 140 }}
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="RESOLVED">Resolved</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="adm-card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div className="adm-empty" style={{ padding: 40, textAlign: "center" }}>
            <div className="adm-empty-title">{leads.length === 0 ? "No leads yet" : "No matching inquiries"}</div>
            <div className="adm-empty-desc">
              {leads.length === 0 ? "When users submit the contact form, their inquiries will appear here." : "Try adjusting your search or status filter."}
            </div>
          </div>
        ) : (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Message</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((lead) => {
                    const dateStr = typeof lead.createdAt === "string" ? new Date(lead.createdAt).toLocaleDateString() : lead.createdAt.toLocaleDateString()
                    return (
                      <tr key={lead.id}>
                        <td className="adm-mono" style={{ color: "var(--adm-muted)", fontSize: 12 }}>
                          {dateStr}
                        </td>
                        <td style={{ fontWeight: 600 }}>{lead.name}</td>
                        <td>
                          <a href={`mailto:${lead.email}`} style={{ color: "var(--adm-forest)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Mail size={13} /> {lead.email}
                          </a>
                        </td>
                        <td style={{ maxWidth: 360, whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.5, fontSize: 13 }} title={lead.message}>
                          {lead.message}
                        </td>
                        <td>
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: lead.status === "NEW" ? "var(--adm-amber-soft)" : "var(--adm-bg)",
                            color: lead.status === "NEW" ? "var(--adm-amber)" : "var(--adm-muted)",
                          }}>
                            {lead.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
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
