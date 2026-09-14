"use client"

import { useState } from "react"
import { Building2, Search, CheckCircle, XCircle, Trash2, Gift } from "lucide-react"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { toast } from "sonner"
import { suspendClinic, reactivateClinic, deleteClinic, grantPromo } from "@/server/actions/admin/clinics"
import { AdminMenu } from "@/components/ui/AdminMenu"
import Link from "next/link"

export function ClinicsClient({ clinics, activePromos = [] }: { clinics: any[], activePromos?: any[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const { confirm } = useConfirm()

  const filtered = clinics.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()) ||
      c.memberships[0]?.user?.email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleSuspend = async (c: any) => {
    const ok = await confirm({
      title: `Suspend ${c.name}?`,
      body: "Their team will be signed out and see a suspended-account screen until you reactivate them. Data is not deleted.",
      confirmLabel: "Suspend clinic",
      tone: "danger",
    })
    if (!ok) return
    toast.promise(suspendClinic(c.id), { loading: "Suspending...", success: "Clinic suspended", error: "Failed to suspend" })
  }

  const handleReactivate = async (c: any) => {
    const ok = await confirm({
      title: `Reactivate ${c.name}?`,
      body: "The clinic and all its users will regain access immediately.",
      confirmLabel: "Reactivate clinic",
      tone: "primary",
    })
    if (!ok) return
    toast.promise(reactivateClinic(c.id), { loading: "Reactivating...", success: "Clinic reactivated", error: "Failed to reactivate" })
  }

  const handleDelete = async (c: any) => {
    const ok = await confirm({
      title: `Delete ${c.name}?`,
      body: "This will permanently delete the clinic, all patients, appointments, and billing data.",
      confirmLabel: "Delete clinic",
      verifyString: c.slug,
      tone: "danger",
    })
    if (!ok) return
    toast.promise(deleteClinic(c.id), { loading: "Deleting...", success: "Clinic deleted", error: "Failed to delete" })
  }

  const handleGrantPromo = async (c: any, promoId: string) => {
    const promo = activePromos.find(p => p.id === promoId)
    if (!promo) return
    const ok = await confirm({
      title: `Grant "${promo.name}" to ${c.name}?`,
      body: `This will manually apply the promo and upgrade them for ${promo.durationDays} days.`,
      confirmLabel: "Apply Promo",
      tone: "primary",
    })
    if (!ok) return
    toast.promise(grantPromo(c.id, promoId), { loading: "Applying...", success: "Promo applied", error: "Failed to apply promo" })
  }

  const statusCounts = {
    ALL: clinics.length,
    ACTIVE: clinics.filter(c => c.status === "ACTIVE").length,
    SUSPENDED: clinics.filter(c => c.status === "SUSPENDED").length,
  }

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Building2 size={22} /> Clinics
          <span className="adm-badge adm-badge-gray" style={{ fontSize: 13, fontWeight: 600, marginLeft: 4 }}>{clinics.length}</span>
        </h1>
      </div>

      <div className="adm-card">
        {/* Filter chips */}
        <div className="adm-filter-row">
          {[
            { key: "ALL", label: `All (${statusCounts.ALL})` },
            { key: "ACTIVE", label: `Active (${statusCounts.ACTIVE})` },
            { key: "SUSPENDED", label: `Suspended (${statusCounts.SUSPENDED})`, tone: "coral" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`adm-filter-chip${statusFilter === f.key ? " active" : ""}${f.tone ? ` ${f.tone}` : ""}`}
            >
              {f.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {/* Search */}
          <div className="adm-search-row" style={{ padding: "0", border: "none", flex: "0 0 280px" }}>
            <Search size={14} color="var(--adm-muted)" />
            <input
              className="adm-search-input"
              placeholder="Search clinics…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Clinic</th>
                <th>Owner</th>
                <th>Plan</th>
                <th>Patients</th>
                <th>Doctors</th>
                <th>Status</th>
                <th>Registered</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/clinics/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--adm-accent)" }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "var(--adm-muted)" }} className="adm-mono">/{c.slug} · {c.type}</div>
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontSize: 13.5 }}>{c.memberships[0]?.user?.name || "—"}</div>
                    <div style={{ fontSize: 12, color: "var(--adm-muted)" }}>{c.memberships[0]?.user?.email || ""}</div>
                  </td>
                  <td>
                    <span className="adm-badge adm-badge-forest">{c.subscription?.plan?.name || "Trial"}</span>
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 600 }} className="adm-mono">{c._count.patients}</td>
                  <td style={{ textAlign: "center", fontWeight: 600 }} className="adm-mono">{c._count.doctors}</td>
                  <td>
                    <span className={`adm-badge ${c.status === "ACTIVE" ? "adm-badge-green" : "adm-badge-red"}`}>
                      {c.status === "ACTIVE" ? <CheckCircle size={11} /> : <XCircle size={11} />}
                      {c.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--adm-muted)", whiteSpace: "nowrap" }} className="adm-mono">
                    {new Date(c.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td>
                    <AdminMenu
                      actions={[
                        {
                          label: "View Details",
                          icon: <Building2 size={14} />,
                          onSelect: () => window.location.href = `/admin/clinics/${c.id}`,
                        },
                        ...(activePromos.length > 0 ? activePromos.map((p: any) => ({
                          label: `Grant: ${p.name}`,
                          icon: <Gift size={14} />,
                          onSelect: () => handleGrantPromo(c, p.id),
                        })) : []),
                        {
                          label: c.status === "ACTIVE" ? "Suspend Clinic" : "Reactivate Clinic",
                          icon: c.status === "ACTIVE" ? <XCircle size={14} /> : <CheckCircle size={14} />,
                          tone: c.status === "ACTIVE" ? "warning" : "default",
                          onSelect: () => c.status === "ACTIVE" ? handleSuspend(c) : handleReactivate(c),
                          separator: activePromos.length > 0,
                        },
                        {
                          label: "Delete Clinic",
                          icon: <Trash2 size={14} />,
                          tone: "danger",
                          onSelect: () => handleDelete(c),
                          separator: true,
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "48px", color: "var(--adm-muted)" }}>
                    {search ? "No clinics match your search." : "No clinics registered yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
