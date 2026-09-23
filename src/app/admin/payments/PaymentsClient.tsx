"use client"

import { useState } from "react"
import Link from "next/link"
import { CreditCard, Search, ExternalLink } from "lucide-react"

const STATUS_CLASSES: Record<string, string> = {
  succeeded: "adm-badge-green",
  failed: "adm-badge-red",
  refunded: "adm-badge-amber",
}

export function PaymentsClient({ payments }: { payments: any[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  const filtered = payments.filter(p => {
    const matchSearch =
      p.clinic?.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.clinic?.slug?.toLowerCase().includes(search.toLowerCase()) ||
      p.razorpayPaymentId?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "ALL" || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const totals = {
    succeeded: payments.filter(p => p.status === "succeeded").reduce((s, p) => s + p.amount, 0),
    failed: payments.filter(p => p.status === "failed").length,
    refunded: payments.filter(p => p.status === "refunded").length,
  }

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CreditCard size={22} /> Payments
          <span className="adm-badge adm-badge-gray">{payments.length}</span>
        </h1>
      </div>

      {/* Mini stats */}
      <div className="adm-stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 20 }}>
        <div className="adm-stat">
          <div className="adm-stat-icon adm-stat-icon-success"><CreditCard size={18} /></div>
          <div className="adm-stat-val adm-mono" style={{ fontSize: 22 }}>
            ₹{(totals.succeeded / 100).toLocaleString("en-IN")}
          </div>
          <div className="adm-stat-lbl">Revenue collected</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-icon adm-stat-icon-coral"><CreditCard size={18} /></div>
          <div className="adm-stat-val">{totals.failed}</div>
          <div className="adm-stat-lbl">Failed payments</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-icon adm-stat-icon-amber"><CreditCard size={18} /></div>
          <div className="adm-stat-val">{totals.refunded}</div>
          <div className="adm-stat-lbl">Refunded</div>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-filter-row">
          {[
            { key: "ALL", label: "All" },
            { key: "succeeded", label: "Succeeded" },
            { key: "failed", label: "Failed", tone: "coral" },
            { key: "refunded", label: "Refunded", tone: "amber" },
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Search size={14} color="var(--adm-muted)" />
            <input
              className="adm-search-input"
              placeholder="Search clinic or invoice ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 240 }}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-icon"><CreditCard size={24} /></div>
            <div className="adm-empty-title">No payments found</div>
            <div className="adm-empty-desc">Payments appear here when Razorpay webhooks are received.</div>
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Clinic</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Razorpay ID</th>
                  <th>Date</th>
                  <th className="adm-text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/clinics/${p.clinicId}`} style={{ textDecoration: "none", color: "var(--adm-accent)", fontWeight: 600, fontSize: 13.5 }}>
                        {p.clinic?.name || p.clinicId}
                      </Link>
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontWeight: 600, fontSize: 13.5 }}>
                      {(p.amount / 100).toLocaleString("en-IN", { style: "currency", currency: p.currency.toUpperCase() })}
                    </td>
                    <td>
                      <span className={`adm-badge ${STATUS_CLASSES[p.status] || "adm-badge-gray"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="adm-mono" style={{ fontSize: 12, color: "var(--adm-muted)" }}>
                      {p.razorpayPaymentId || "—"}
                    </td>
                    <td className="adm-mono" style={{ fontSize: 12.5, color: "var(--adm-muted)", whiteSpace: "nowrap" }}>
                      {new Date(p.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {p.razorpayPaymentId && (
                        <a
                          href={`https://dashboard.razorpay.com/app/payments/${p.razorpayPaymentId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="adm-btn adm-btn-ghost adm-btn-icon adm-btn-sm"
                          title="View in Razorpay"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
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
