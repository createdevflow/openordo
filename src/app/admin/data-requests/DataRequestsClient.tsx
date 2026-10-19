"use client"

import { useState } from "react"
import { Search, FileDown, CheckCircle2, Clock, Download, RefreshCw } from "lucide-react"
import { adminProcessDataRequestAction } from "@/server/actions/data-export"
import { AdminPagination, paginateData } from "@/components/ui/AdminPagination"
import { toast } from "sonner"

interface DataRequestItem {
  id: string
  status: string
  downloadUrl?: string | null
  createdAt: string
  patientAccount: {
    name: string
    email: string
  }
  clinic: {
    name: string
  }
}

export function DataRequestsClient({ initialRequests }: { initialRequests: DataRequestItem[] }) {
  const [requests, setRequests] = useState(initialRequests)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleProcess = async (id: string) => {
    setProcessingId(id)
    try {
      await adminProcessDataRequestAction(id)
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "COMPLETED" } : r))
      toast.success("Data export generated and sent")
    } catch (err: any) {
      toast.error(err.message || "Failed to process data export request")
    } finally {
      setProcessingId(null)
    }
  }

  const filtered = requests.filter((req) => {
    const term = search.toLowerCase()
    const matchSearch =
      req.patientAccount?.name?.toLowerCase().includes(term) ||
      req.patientAccount?.email?.toLowerCase().includes(term) ||
      req.clinic?.name?.toLowerCase().includes(term)
    const matchStatus = statusFilter === "ALL" || req.status === statusFilter
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
            <FileDown size={22} /> Data Export Requests
            <span className="adm-badge adm-badge-gray">{requests.length}</span>
          </h1>
          <span style={{ fontSize: 13, color: "var(--adm-muted)" }}>
            Manage GDPR / HIPAA patient requests for full medical records and data export.
          </span>
        </div>
      </div>

      <div className="adm-filters-bar" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--adm-muted)" }} />
          <input
            type="text"
            className="adm-input"
            style={{ paddingLeft: 34, width: "100%" }}
            placeholder="Search by patient name, email, or clinic..."
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
          <option value="PENDING">Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      <div className="adm-card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div className="adm-empty" style={{ padding: 40, textAlign: "center" }}>
            <div className="adm-empty-title">{requests.length === 0 ? "No data export requests" : "No matches found"}</div>
            <div className="adm-empty-desc">
              {requests.length === 0 ? "When patients request their data export, it will appear here." : "Try adjusting your search criteria or status filter."}
            </div>
          </div>
        ) : (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Clinic</th>
                    <th>Requested At</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{req.patientAccount?.name}</div>
                        <div style={{ fontSize: 12, color: "var(--adm-muted)" }}>{req.patientAccount?.email}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{req.clinic?.name}</span>
                      </td>
                      <td className="adm-mono" style={{ fontSize: 12, color: "var(--adm-muted)" }}>
                        {new Date(req.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span className={`adm-badge ${req.status === "PENDING" ? "adm-badge-amber" : req.status === "COMPLETED" ? "adm-badge-green" : "adm-badge-red"}`}>
                          {req.status === "PENDING" && <Clock size={11} style={{ marginRight: 4 }} />}
                          {req.status === "COMPLETED" && <CheckCircle2 size={11} style={{ marginRight: 4 }} />}
                          {req.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {req.status === "PENDING" && (
                          <button
                            onClick={() => handleProcess(req.id)}
                            disabled={processingId === req.id}
                            className="adm-btn adm-btn-primary adm-btn-sm"
                          >
                            {processingId === req.id ? (
                              <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Generating…</>
                            ) : (
                              "Generate & Send"
                            )}
                          </button>
                        )}
                        {req.status === "COMPLETED" && req.downloadUrl && (
                          <a
                            href={req.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="adm-btn adm-btn-ghost adm-btn-sm"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            <Download size={13} /> View ZIP
                          </a>
                        )}
                      </td>
                    </tr>
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
