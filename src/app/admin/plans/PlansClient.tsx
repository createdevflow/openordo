"use client"

import { Plus, Archive, CheckCircle, XCircle, Pencil, Star } from "lucide-react"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { toast } from "sonner"
import { togglePlanActive, archivePlan } from "@/server/actions/admin/plans"
import Link from "next/link"
import { AdminMenu } from "@/components/ui/AdminMenu"

export function PlansClient({ plans }: { plans: any[] }) {
  const { confirm } = useConfirm()

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

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-page-title">Plans</h1>
        <Link href="/admin/plans/new" className="adm-btn adm-btn-primary">
          <Plus size={14} /> Create Plan
        </Link>
      </div>

      <div className="adm-card">
        {plans.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-icon"><Star size={24} /></div>
            <div className="adm-empty-title">No plans yet</div>
            <div className="adm-empty-desc">Create your first plan to start billing clinics on OpenORDO.</div>
            <Link href="/admin/plans/new" className="adm-btn adm-btn-primary">
              <Plus size={14} /> Create First Plan
            </Link>
          </div>
        ) : (
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
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
        )}
      </div>
    </div>
  )
}
