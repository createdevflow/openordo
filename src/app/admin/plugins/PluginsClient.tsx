"use client"

import { useState } from "react"
import {
  Plus, Archive, CheckCircle, XCircle, Pencil, Puzzle,
  Video, Package, FileSignature
} from "lucide-react"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { toast } from "sonner"
import {
  togglePluginActive,
  archivePlugin,
} from "@/server/actions/admin/plugins"
import Link from "next/link"
import { AdminMenu } from "@/components/ui/AdminMenu"

const ICON_MAP: Record<string, React.ElementType> = { Video, Package, FileSignature, Puzzle }

function PricingChips({ plugin }: { plugin: any }) {
  const chips: string[] = []
  if (plugin.priceOneTimeINR) chips.push("One-time")
  if (plugin.priceMonthlyINR) chips.push("Monthly")
  if (plugin.priceYearlyINR) chips.push("Yearly")
  if (chips.length === 0) return <span style={{ color: "var(--adm-muted)" }}>—</span>
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {chips.map(c => (
        <span key={c} className="adm-badge adm-badge-blue" style={{ fontSize: 10 }}>{c}</span>
      ))}
    </div>
  )
}

export function PluginsClient({ plugins }: { plugins: any[] }) {
  const { confirm } = useConfirm()

  const handleToggleActive = async (plugin: any) => {
    toast.promise(togglePluginActive(plugin.id, !plugin.isActive), {
      loading: "Updating...",
      success: !plugin.isActive ? "Plugin is now visible" : "Plugin hidden",
      error: "Failed to update",
    })
  }

  const handleArchive = async (plugin: any) => {
    const ok = await confirm({
      title: `Archive ${plugin.name}?`,
      body: "Existing purchasers keep access. This plugin will no longer appear for new clinics to buy.",
      tone: "danger",
    })
    if (!ok) return
    toast.promise(archivePlugin(plugin.id), {
      loading: "Archiving...",
      success: "Plugin archived",
      error: "Failed to archive",
    })
  }

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-page-title">Plugins</h1>
        <Link href="/admin/plugins/new" className="adm-btn adm-btn-primary">
          <Plus size={14} /> Create Plugin
        </Link>
      </div>

      <div className="adm-card">
        {plugins.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-icon"><Puzzle size={24} /></div>
            <div className="adm-empty-title">No plugins yet</div>
            <div className="adm-empty-desc">Create your first plugin to offer add-ons to clinics.</div>
            <Link href="/admin/plugins/new" className="adm-btn adm-btn-primary">
              <Plus size={14} /> Create First Plugin
            </Link>
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Kind</th>
                  <th>Pricing Models</th>
                  <th>Status</th>
                  <th>Clinics Using</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {plugins.map((p) => {
                  const Icon = ICON_MAP[p.icon] || Puzzle
                  return (
                    <tr key={p.id} style={{ opacity: p.isActive ? 1 : 0.55 }}>
                      <td style={{ width: 48 }}>
                        <span className="adm-mono" style={{ fontSize: 12.5, color: "var(--adm-muted)", fontWeight: 600 }}>{p.sortOrder}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--adm-surface2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon size={16} style={{ color: "var(--adm-muted)" }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</div>
                            <div style={{ fontSize: 12, color: "var(--adm-muted)" }} className="adm-mono">{p.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`adm-badge ${p.category === "Clinical" ? "adm-badge-blue" : "adm-badge-amber"}`}>
                          {p.category}
                        </span>
                      </td>
                      <td>
                        <span className="adm-badge" style={{ background: "var(--adm-surface2)", color: "var(--adm-ink)" }}>
                          {p.kind === "LIMIT_MODIFIER" ? "Limit" : "Feature"}
                        </span>
                      </td>
                      <td><PricingChips plugin={p} /></td>
                      <td>
                        {p.isComingSoon ? (
                          <span className="adm-badge adm-badge-amber">Coming Soon</span>
                        ) : (
                          <span className={`adm-badge ${p.isActive ? "adm-badge-green" : "adm-badge-gray"}`}>
                            {p.isActive ? "Active" : "Archived"}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700 }} className="adm-mono">
                        {p._count?.clinicPlugins ?? 0}
                      </td>
                      <td>
                        <AdminMenu actions={[
                          {
                            label: "Edit Plugin",
                            icon: <Pencil size={14} />,
                            onSelect: () => window.location.href = `/admin/plugins/${p.id}`,
                          },
                          {
                            label: p.isActive ? "Hide Plugin" : "Make Visible",
                            icon: p.isActive ? <XCircle size={14} /> : <CheckCircle size={14} />,
                            tone: p.isActive ? "warning" : "default",
                            onSelect: () => handleToggleActive(p),
                            separator: true,
                          },
                          {
                            label: "Archive Plugin",
                            icon: <Archive size={14} />,
                            tone: "danger",
                            onSelect: () => handleArchive(p),
                            hidden: !p.isActive,
                            separator: true,
                          },
                        ]} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
