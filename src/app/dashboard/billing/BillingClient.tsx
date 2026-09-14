"use client"

import React, { useState, useTransition } from "react"
import { Plus, X, Download, Lock } from "lucide-react"
import { currency, fmtDateShort, StatusBadge, toISO } from "@/components/DashboardHelpers"
import { createInvoiceAction, markInvoicePaidAction } from "@/server/actions/billing"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import Link from "next/link"

export function BillingClient({ 
  invoices, 
  patients, 
  clinic, 
  hasRevenueReports = false, 
  hasInsurance = false, 
  planName = "Practice",
  initialAction,
  initialPatientId
}: any) {
  const [printingInvoice, setPrintingInvoice] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("all")
  const [modalOpen, setModalOpen] = useState(initialAction === "new")
  const [isPending, startTransition] = useTransition()
  const { confirm, showAlert } = useConfirm()

  // Ensure items are parsed
  const mappedInvoices = invoices.map((inv: any) => ({
    ...inv,
    items: typeof inv.items === "string" ? JSON.parse(inv.items) : inv.items || []
  }))

  const totalRevenue = mappedInvoices.filter((i: any) => i.status.toLowerCase() === "paid").reduce((s: number, i: any) => s + i.items.reduce((a: number, it: any) => a + Number(it.amount), 0), 0)
  const totalPending = mappedInvoices.filter((i: any) => i.status.toLowerCase() === "unpaid").reduce((s: number, i: any) => s + i.items.reduce((a: number, it: any) => a + Number(it.amount), 0), 0)
  const patientName = (id: string) => patients.find((p: any) => p.id === id)?.name || "Unknown"

  const filtered = mappedInvoices.filter((i: any) => statusFilter === "all" || i.status.toLowerCase() === statusFilter).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

  function exportRevenueCSV() {
    const rows = [
      ["Invoice ID", "Patient", "Date", "Items", "Amount", "Status"],
      ...mappedInvoices.map((inv: any) => {
        const total = inv.items.reduce((s: number, it: any) => s + Number(it.amount), 0)
        return [
          inv.displayId,
          patientName(inv.patientId),
          inv.date,
          inv.items.map((it: any) => it.desc).join(" | "),
          total.toString(),
          inv.status
        ]
      })
    ]
    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e: any[]) => e.map((x: any) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `revenue_report_${clinic?.slug || "clinic"}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function markPaid(id: string) {
    startTransition(async () => {
      try {
        await markInvoicePaidAction(id)
      } catch (err) {
        console.error(err)
        showAlert({ title: "Error", body: "Failed to update invoice", tone: "danger" })
      }
    })
  }

  function createInvoice(data: any) {
    startTransition(async () => {
      try {
        await createInvoiceAction(data)
        setModalOpen(false)
      } catch (err) {
        console.error(err)
        showAlert({ title: "Error", body: "Failed to create invoice", tone: "danger" })
      }
    })
  }

  return (
    <div>
      <div className="cw-stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="cw-stat-card">
          <div className="val">{currency(totalRevenue)}</div><div className="lbl">Total collected</div>
        </div>
        <div className="cw-stat-card">
          <div className="val">{currency(totalPending)}</div><div className="lbl">Pending collection</div>
        </div>
        <div className="cw-stat-card">
          <div className="val">{mappedInvoices.length}</div><div className="lbl">Total invoices</div>
        </div>
      </div>

      <div className="cw-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="cw-chip-filter">
          {["all", "paid", "unpaid"].map(s => (
            <button key={s} className={`cw-chip ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>{s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {hasRevenueReports ? (
            <button className="cw-btn cw-btn-ghost cw-btn-sm" onClick={exportRevenueCSV} title="Export revenue report as CSV">
              <Download size={13} style={{ marginRight: 4 }} /> Revenue Report
            </button>
          ) : (
            <Link href="/dashboard/settings?tab=subscription" className="cw-btn cw-btn-ghost cw-btn-sm" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 4, color: "var(--ink-soft)" }}>
              <Lock size={12} /> Revenue Reports (Clinic Group)
            </Link>
          )}
          <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={() => setModalOpen(true)} disabled={isPending}>
            <Plus size={15} /> New invoice
          </button>
        </div>
      </div>

      <div className="cw-panel">
        <div className="cw-table-wrap">
          <table className="cw-table">
            <thead><tr><th>Invoice</th><th>Patient</th><th>Date</th><th>Items</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map((inv: any) => {
                const total = inv.items.reduce((s: number, it: any) => s + Number(it.amount), 0);
                return (
                  <tr key={inv.id}>
                    <td className="mono">{inv.displayId}</td>
                    <td style={{ fontWeight: 600 }}>{patientName(inv.patientId)}</td>
                    <td className="num">{fmtDateShort(inv.date)}</td>
                    <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{inv.items.map((it: any) => it.desc).join(", ")}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{currency(total)}</td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {inv.status.toLowerCase() === "unpaid" && (
                          <button className="cw-btn cw-btn-ghost cw-btn-sm" onClick={() => markPaid(inv.id)} disabled={isPending}>Mark paid</button>
                        )}
                        <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={() => {
                          setPrintingInvoice(inv);
                          setTimeout(() => window.print(), 100);
                        }} title="Download / Print Invoice"><Download size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && <InvoiceModal patients={patients} initialPatientId={initialPatientId} onClose={() => setModalOpen(false)} onSave={createInvoice} isPending={isPending} />}
      {printingInvoice && (
        <InvoicePrintTemplate 
          invoice={printingInvoice} 
          patient={patients.find((p: any) => p.id === printingInvoice.patientId)}
          clinic={clinic} 
        />
      )}
    </div>
  )
}

function InvoicePrintTemplate({ invoice, clinic, patient }: any) {
  let config: any = {};
  try {
    config = JSON.parse(clinic.billingConfig || "{}");
  } catch(e) {}
  
  const total = invoice.items.reduce((s: number, it: any) => s + Number(it.amount), 0);

  return (
    <div id="print-root" style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", color: "#000", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #eee", paddingBottom: "20px", marginBottom: "30px" }}>
        <div>
          {config.invoiceLogo ? (
            <img src={config.invoiceLogo} alt="Logo" style={{ maxHeight: 60, marginBottom: 10 }} />
          ) : (
            <h1 style={{ margin: 0, fontSize: 24, color: "var(--forest)" }}>{clinic?.name}</h1>
          )}
          <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
            {clinic?.address}<br />
            {clinic?.phone && <span>Phone: {clinic.phone}<br /></span>}
            {config.gstNumber && <span>GSTIN: {config.gstNumber}<br /></span>}
            {config.einNumber && <span>EIN: {config.einNumber}<br /></span>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ margin: 0, fontSize: 28, color: "#333", letterSpacing: 1 }}>INVOICE</h2>
          <div style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
            <strong>Invoice #:</strong> {invoice.displayId}<br />
            <strong>Date:</strong> {fmtDateShort(invoice.date)}<br />
            <strong>Status:</strong> <span style={{ textTransform: "uppercase", fontWeight: 600 }}>{invoice.status}</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "40px" }}>
        <h3 style={{ fontSize: 14, textTransform: "uppercase", color: "#888", borderBottom: "1px solid #eee", paddingBottom: 4, marginBottom: 12 }}>Bill To</h3>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{patient?.name || "Unknown Patient"}</div>
        <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
          {patient?.email}<br />
          {patient?.phone}
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "40px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
            <th style={{ padding: "10px 0", fontSize: 13, color: "#888", textTransform: "uppercase" }}>Description</th>
            <th style={{ padding: "10px 0", fontSize: 13, color: "#888", textTransform: "uppercase", textAlign: "right", width: 120 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it: any, i: number) => (
            <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "12px 0", fontSize: 14 }}>{it.desc}</td>
              <td style={{ padding: "12px 0", fontSize: 14, textAlign: "right" }}>{currency(it.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: 250 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18, borderTop: "2px solid #eee", paddingTop: 12 }}>
            <span>Total</span>
            <span>{currency(total)}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 80, borderTop: "1px solid #eee", paddingTop: 20, fontSize: 12, color: "#888", textAlign: "center" }}>
        {config.invoiceNotes || "Thank you for choosing our clinic."}
      </div>
    </div>
  )
}

function InvoiceModal({ patients, onClose, onSave, isPending, initialPatientId }: any) {
  const [patientId, setPatientId] = useState(initialPatientId || patients[0]?.id || "");
  const today = new Date();
  const [date, setDate] = useState(toISO(today.getFullYear(), today.getMonth(), today.getDate()));
  const [items, setItems] = useState([{ desc: "", amount: "" }]);

  function updateItem(i: number, key: string, val: string) {
    const next = [...items]; 
    next[i] = { ...next[i], [key]: val }; 
    setItems(next);
  }
  const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);

  return (
    <div className="cw-overlay" onClick={onClose}>
      <div className="cw-modal" onClick={e => e.stopPropagation()}>
        <div className="cw-modal-head">
          <h3>New invoice</h3>
          <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={onClose} disabled={isPending}><X size={16} /></button>
        </div>
        <form onSubmit={e => {
          e.preventDefault();
          onSave({ patientId, date, items: items.filter(it => it.desc && it.amount).map(it => ({ desc: it.desc, amount: Number(it.amount) })) });
        }}>
          <div className="cw-modal-body">
            <div className="cw-row2">
              <div className="cw-field"><label>Patient</label>
                <select className="cw-select" value={patientId} onChange={e => setPatientId(e.target.value)} required disabled={isPending}>
                  {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="cw-field"><label>Date</label><input className="cw-input" type="date" value={date} onChange={e => setDate(e.target.value)} required disabled={isPending} /></div>
            </div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 8 }}>Line items</label>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input className="cw-input" placeholder="Description" value={it.desc} onChange={e => updateItem(i, "desc", e.target.value)} style={{ flex: 2 }} disabled={isPending} />
                <input className="cw-input" type="number" placeholder="Amount" value={it.amount} onChange={e => updateItem(i, "amount", e.target.value)} style={{ flex: 1 }} disabled={isPending} />
                {items.length > 1 && <button type="button" className="cw-btn cw-btn-ghost cw-btn-icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))} disabled={isPending}><X size={14} /></button>}
              </div>
            ))}
            <button type="button" className="cw-btn cw-btn-ghost cw-btn-sm" onClick={() => setItems([...items, { desc: "", amount: "" }])} disabled={isPending}><Plus size={13} />Add line item</button>
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>Total</span><span className="mono">{currency(total)}</span>
            </div>
          </div>
          <div className="cw-modal-foot">
            <button type="button" className="cw-btn cw-btn-ghost cw-btn-sm" onClick={onClose} disabled={isPending}>Cancel</button>
            <button type="submit" className="cw-btn cw-btn-primary cw-btn-sm" disabled={isPending}>Create invoice</button>
          </div>
        </form>
      </div>
    </div>
  )
}
