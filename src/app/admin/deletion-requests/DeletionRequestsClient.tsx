"use client"

import { useState } from "react"
import { Search, UserX, Trash2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { approveDeletionRequest, rejectDeletionRequest } from "@/server/actions/admin/deletion-requests"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { toast } from "sonner"
import { AdminPagination, paginateData } from "@/components/ui/AdminPagination"

interface DeletionRequestItem {
  id: string
  email: string
  reason: string
  status: string
  createdAt: string
  user: {
    id: string
    name: string
    status: string
  } | null
}

export function DeletionRequestsClient({ initialRequests }: { initialRequests: DeletionRequestItem[] }) {
  const [requests, setRequests] = useState(initialRequests)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const { confirm } = useConfirm()

  const handleApprove = async (req: DeletionRequestItem) => {
    const ok = await confirm({
      title: "Approve account deletion?",
      body: req.user
        ? `This will soft-delete user ${req.user.name} (${req.email}) and mark their clinics for deletion.`
        : `No matching active account found for ${req.email}. Approve request anyway?`,
      confirmLabel: "Approve Deletion",
      tone: "danger",
    })
    if (!ok) return

    setLoadingId(req.id)
    try {
      await approveDeletionRequest(req.id)
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: "APPROVED" } : r))
      toast.success("Deletion request approved")
    } catch (err: any) {
      toast.error(err.message || "Failed to approve deletion")
    } finally {
      setLoadingId(null)
    }
  }

  const handleReject = async (req: DeletionRequestItem) => {
    const ok = await confirm({
      title: "Reject account deletion?",
      body: `The user ${req.email} will not have their account deleted.`,
      confirmLabel: "Reject Request",
      tone: "neutral",
    })
    if (!ok) return

    setLoadingId(req.id)
    try {
      await rejectDeletionRequest(req.id)
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: "REJECTED" } : r))
      toast.success("Deletion request rejected")
    } catch (err: any) {
      toast.error(err.message || "Failed to reject deletion")
    } finally {
      setLoadingId(null)
    }
  }

  const filtered = requests.filter((r) => {
    const term = search.toLowerCase()
    const matchSearch =
      r.email?.toLowerCase().includes(term) ||
      r.user?.name?.toLowerCase().includes(term) ||
      r.reason?.toLowerCase().includes(term)
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter
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
            <UserX size={22} /> Account Deletion Requests
            <span className="adm-badge adm-badge-gray">{requests.length}</span>
          </h1>
          <span style={{ fontSize: 13, color: "var(--adm-muted)" }}>
            Review and process user requests to permanently delete their accounts and clinics.
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
            placeholder="Search by requested email, name, or reason..."
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
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="adm-card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div className="adm-empty" style={{ padding: 40, textAlign: "center" }}>
            <div className="adm-empty-title">{requests.length === 0 ? "No deletion requests" : "No matches found"}</div>
            <div className="adm-empty-desc">
              {requests.length === 0 ? "When users request account deletion, their requests will appear here." : "Try adjusting your search criteria or status filter."}
            </div>
          </div>
        ) : (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Requested Email</th>
                    <th>Account Found</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Requested At</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((req) => (
                    <tr key={req.id}>
                      <td style={{ fontWeight: 600 }}>{req.email}</td>
                      <td>
                        {req.user ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontWeight: 500 }}>{req.user.name}</span>
                            <span style={{ fontSize: 11, color: "var(--adm-muted)" }} className="adm-mono">{req.user.id}</span>
                            <span className={`adm-badge ${req.user.status === "ACTIVE" ? "adm-badge-green" : "adm-badge-red"}`} style={{ width: "fit-content", marginTop: 2, fontSize: 10 }}>
                              {req.user.status}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--adm-muted)", fontStyle: "italic" }}>No account found</span>
                        )}
                      </td>
                      <td style={{ maxWidth: 280, whiteSpace: "normal", wordBreak: "break-word", fontSize: 13, lineHeight: 1.4 }} title={req.reason}>
                        {req.reason || "—"}
                      </td>
                      <td>
                        <span className={`adm-badge ${req.status === "PENDING" ? "adm-badge-amber" : req.status === "APPROVED" ? "adm-badge-green" : "adm-badge-red"}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="adm-mono" style={{ fontSize: 12, color: "var(--adm-muted)" }}>
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {req.status === "PENDING" && (
                          <div style={{ display: "inline-flex", gap: 8 }}>
                            <button
                              onClick={() => handleApprove(req)}
                              disabled={loadingId === req.id}
                              className="adm-btn adm-btn-danger adm-btn-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(req)}
                              disabled={loadingId === req.id}
                              className="adm-btn adm-btn-ghost adm-btn-sm"
                            >
                              Reject
                            </button>
                          </div>
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
