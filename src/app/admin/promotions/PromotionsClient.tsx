"use client"

import { useState } from "react"
import { Plus, Trash2, PauseCircle, PlayCircle, StopCircle, Pencil, Megaphone, Search } from "lucide-react"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { toast } from "sonner"
import { pausePromo, resumePromo, endPromoNow, deletePromo } from "@/server/actions/admin/promotions"
import Link from "next/link"
import { AdminMenu } from "@/components/ui/AdminMenu"
import { AdminPagination, paginateData } from "@/components/ui/AdminPagination"

export function PromotionsClient({ promotions }: { promotions: any[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const { confirm } = useConfirm()

  const handlePause = async (promo: any) => {
    const ok = await confirm({
      title: `Pause ${promo.name}?`,
      body: "This will stop new redemptions. Existing redemptions will keep running until their expiry date.",
    })
    if (!ok) return
    toast.promise(pausePromo(promo.id), { loading: "Pausing...", success: "Promo paused", error: "Failed to pause" })
  }

  const handleResume = async (promo: any) => {
    const ok = await confirm({
      title: `Resume ${promo.name}?`,
      body: promo.eligibility === "NEW_CLINICS_ONLY"
        ? "This will make this promo live for all new signups. Any other active new-signup promo will be paused automatically."
        : "This will resume redemptions for this promo.",
      tone: "primary"
    })
    if (!ok) return
    toast.promise(resumePromo(promo.id), { loading: "Resuming...", success: "Promo resumed", error: "Failed to resume" })
  }

  const handleEndNow = async (promo: any) => {
    const ok = await confirm({
      title: `End ${promo.name} immediately?`,
      body: "This will expire ALL active redemptions immediately. Affected clinics will be downgraded to the default free plan on the next check.",
      tone: "danger"
    })
    if (!ok) return
    toast.promise(endPromoNow(promo.id), { loading: "Ending...", success: "Promo ended", error: "Failed to end" })
  }

  const handleDelete = async (promo: any) => {
    if (promo._count?.redemptions > 0) {
      toast.error("Cannot delete a promo with redemptions. End it first.")
      return
    }
    const ok = await confirm({
      title: `Delete ${promo.name}?`,
      body: "This cannot be undone.",
      tone: "danger"
    })
    if (!ok) return
    toast.promise(deletePromo(promo.id), { loading: "Deleting...", success: "Promo deleted", error: "Failed to delete" })
  }

  const getPromoState = (p: any) => {
    const isLive = p.isActive && (!p.startsAt || new Date(p.startsAt) <= new Date()) && (!p.endsAt || new Date(p.endsAt) >= new Date())
    const isScheduled = p.isActive && p.startsAt && new Date(p.startsAt) > new Date()
    const isEnded = !p.isActive && p.endsAt && new Date(p.endsAt) < new Date()
    const isPaused = !p.isActive && !isEnded
    if (isLive) return "LIVE"
    if (isScheduled) return "SCHEDULED"
    if (isPaused) return "PAUSED"
    return "ENDED"
  }

  const filtered = promotions.filter((p) => {
    const term = search.toLowerCase()
    const matchSearch =
      p.name?.toLowerCase().includes(term) ||
      p.headline?.toLowerCase().includes(term) ||
      p.targetPlan?.name?.toLowerCase().includes(term)
    const state = getPromoState(p)
    const matchStatus = statusFilter === "ALL" || state === statusFilter
    return matchSearch && matchStatus
  })

  const paginated = paginateData(filtered, page, pageSize)

  const handleSearch = (val: string) => { setSearch(val); setPage(1) }
  const handleStatusFilter = (val: string) => { setStatusFilter(val); setPage(1) }

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Megaphone size={22} /> Promotions
          <span className="adm-badge adm-badge-gray">{promotions.length}</span>
        </h1>
        <Link href="/admin/promotions/new" className="adm-btn adm-btn-primary">
          <Plus size={14} /> Create Promo
        </Link>
      </div>

      <div className="adm-filters-bar" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--adm-muted)" }} />
          <input
            type="text"
            className="adm-input"
            style={{ paddingLeft: 34, width: "100%" }}
            placeholder="Search by promo name, headline, or plan..."
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
          <option value="LIVE">Live</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="PAUSED">Paused</option>
          <option value="ENDED">Ended</option>
        </select>
      </div>

      <div className="adm-card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div className="adm-empty" style={{ padding: 40 }}>
            <div className="adm-empty-icon"><Megaphone size={24} /></div>
            <div className="adm-empty-title">{promotions.length === 0 ? "No promotions yet" : "No matches found"}</div>
            <div className="adm-empty-desc">
              {promotions.length === 0
                ? "Create a promotion to offer free or discounted access to new or existing clinics."
                : "Try adjusting your search terms or status filter."}
            </div>
            {promotions.length === 0 && (
              <Link href="/admin/promotions/new" className="adm-btn adm-btn-primary" style={{ marginTop: 12 }}>
                <Plus size={14} /> Create First Promo
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Target Plan</th>
                    <th>Duration</th>
                    <th>Eligibility</th>
                    <th>Redemptions</th>
                    <th>Status</th>
                    <th style={{ width: 44 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p) => {
                    const state = getPromoState(p)
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: "var(--adm-muted)" }}>{p.headline}</div>
                        </td>
                        <td><span className="adm-badge adm-badge-forest">{p.targetPlan.name}</span></td>
                        <td className="adm-mono" style={{ fontWeight: 600 }}>{p.durationDays}d</td>
                        <td>
                          <span className="adm-badge adm-badge-gray">
                            {p.eligibility === "NEW_CLINICS_ONLY" ? "New clinics" : "All clinics"}
                          </span>
                        </td>
                        <td className="adm-mono" style={{ fontWeight: 600 }}>
                          {p.redemptionCount} / {p.redemptionLimit || "∞"}
                        </td>
                        <td>
                          <span className={`adm-badge ${state === "LIVE" ? "adm-badge-green" : state === "SCHEDULED" ? "adm-badge-blue" : state === "PAUSED" ? "adm-badge-gray" : "adm-badge-red"}`}>
                            {state === "LIVE" ? "Live" : state === "SCHEDULED" ? "Scheduled" : state === "PAUSED" ? "Paused" : "Ended"}
                          </span>
                        </td>
                        <td>
                          <AdminMenu actions={[
                            {
                              label: "Edit Promo",
                              icon: <Pencil size={14} />,
                              onSelect: () => window.location.href = `/admin/promotions/${p.id}`,
                            },
                            {
                              label: p.isActive ? "Pause" : "Resume",
                              icon: p.isActive ? <PauseCircle size={14} /> : <PlayCircle size={14} />,
                              tone: p.isActive ? "warning" : "default",
                              onSelect: () => p.isActive ? handlePause(p) : handleResume(p),
                              separator: true,
                            },
                            {
                              label: "End Now",
                              icon: <StopCircle size={14} />,
                              tone: "danger",
                              onSelect: () => handleEndNow(p),
                            },
                            {
                              label: "Delete",
                              icon: <Trash2 size={14} />,
                              tone: "danger",
                              onSelect: () => handleDelete(p),
                              hidden: (p._count?.redemptions ?? 0) > 0,
                            },
                          ]} />
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
