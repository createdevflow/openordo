"use client"

import { useState } from "react"
import { Plus, Archive, CheckCircle, XCircle, Pencil, Star, Search } from "lucide-react"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { toast } from "sonner"
import { togglePlanActive, archivePlan } from "@/server/actions/admin/plans"
import Link from "next/link"
import { AdminMenu } from "@/components/ui/AdminMenu"
import { AdminPagination, paginateData } from "@/components/ui/AdminPagination"

export function PlansClient({ plans }: { plans: any[] }) {
  const { confirm } = useConfirm()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const handleToggleActive = async (plan: any) => {
    toast.promise(togglePlanActive(plan.id, !plan.isActive), {
      loading: "Updating...",
      success: !plan.isActive ? "Plan is now visible" : "Plan hidden",
      error: "Failed to update"
    })
  }

  const handleArchive = async (plan: any) => {
    const ok = await confirm({
      title: `Archive ${plan.name}?`,
      body: "Existing subscribers are unaffected, but new signups can no longer pick this plan.",
      tone: "danger"
    })
    if (!ok) return
    toast.promise(archivePlan(plan.id), { loading: "Archiving...", success: "Plan archived", error: "Failed to archive" })
  }

  const filtered = plans.filter((p) => {
    const term = search.toLowerCase()
    const matchSearch =
      p.name?.toLowerCase().includes(term) ||
      p.slug?.toLowerCase().includes(term)
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && p.isActive) ||
      (statusFilter === "ARCHIVED" && !p.isActive)
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
            <Star size={22} /> Plans
            <span className="adm-badge adm-badge-gray">{plans.length}</span>
          </h1>
          <span style={{ fontSize: 13, color: "var(--adm-muted)" }}>
            Configure subscription tiers, quotas, and pricing for clinics.
          </span>
        </div>
        <Link href="/admin/plans/new" className="adm-btn adm-btn-primary">
          <Plus size={14} /> Create Plan
        </Link>
      </div>

      <div className="adm-filters-bar" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--adm-muted)" }} />
          <input
            type="text"
            className="adm-input"
            style={{ paddingLeft: 34, width: "100%" }}
            placeholder="Search plans by name or slug..."
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
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="adm-card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div className="adm-empty" style={{ padding: 40, textAlign: "center" }}>
            <div className="adm-empty-icon"><Star size={24} /></div>
            <div className="adm-empty-title">{plans.length === 0 ? "No plans yet" : "No matching plans"}</div>
            <div className="adm-empty-desc">
              {plans.length === 0 ? "Create your first plan to start billing clinics on OpenORDO." : "Try adjusting your search or status filter."}
            </div>
            {plans.length === 0 && (
              <Link href="/admin/plans/new" className="adm-btn adm-btn-primary" style={{ marginTop: 12 }}>
                <Plus size={14} /> Create First Plan
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Monthly</th>
                    <th>Yearly</th>
                    <th>Limits</th>
                    <th>Status</th>
                    <th>Subscribers</th>
                    <th style={{ width: 44 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p) => (
                    <tr key={p.id} style={{ opacity: p.isActive ? 1 : 0.55 }}>
                      <td style={{ width: 48 }}>
                        <span className="adm-mono" style={{ fontSize: 12.5, color: "var(--adm-muted)", fontWeight: 600 }}>{p.sortOrder}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</div>
                            <div style={{ fontSize: 12, color: "var(--adm-muted)" }} className="adm-mono">/{p.slug}</div>
                          </div>
                          {p.isFeatured && (
                            <span className="adm-badge adm-badge-amber" style={{ fontSize: 10 }}>★ Featured</span>
                          )}
                          {p.isDefaultFree && (
                            <span className="adm-badge adm-badge-gray" style={{ fontSize: 10 }}>Default</span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }} className="adm-mono">
                        {p.priceMonthlyUsd === 0 ? "Free" : `$${p.priceMonthlyUsd} / ₹${p.priceMonthlyInr}`}
                      </td>
                      <td className="adm-mono" style={{ color: "var(--adm-muted)" }}>
                        {p.priceYearlyUsd ? `$${p.priceYearlyUsd} / ₹${p.priceYearlyInr}` : "—"}
                      </td>
                      <td style={{ fontSize: 12.5, color: "var(--adm-muted)" }}>
                        <div>Pts: <b>{p.patientLimit || "∞"}</b></div>
                        <div>Docs: <b>{p.doctorLimit || "∞"}</b></div>
                        <div>Bookings: <b>{p.bookingPageLimit ?? "∞"}</b>/mo</div>
                        <div>Storage: <b>{p.storageLimitGb ? `${p.storageLimitGb}GB` : "∞"}</b></div>
                      </td>
                      <td>
                        <span className={`adm-badge ${p.isActive ? "adm-badge-green" : "adm-badge-gray"}`}>
                          {p.isActive ? "Active" : "Archived"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700 }} className="adm-mono">{p._count?.subscriptions ?? 0}</td>
                      <td>
                        <AdminMenu actions={[
                          { label: "Edit Plan", icon: <Pencil size={14} />, onSelect: () => window.location.href = `/admin/plans/${p.id}` },
                          {
                            label: p.isActive ? "Hide Plan" : "Make Visible",
                            icon: p.isActive ? <XCircle size={14} /> : <CheckCircle size={14} />,
                            tone: p.isActive ? "warning" : "default",
                            onSelect: () => handleToggleActive(p),
                            separator: true,
                          },
                          {
                            label: "Archive Plan",
                            icon: <Archive size={14} />,
                            tone: "danger",
                            onSelect: () => handleArchive(p),
                            hidden: !p.isActive,
                            separator: true,
                          },
                        ]} />
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
