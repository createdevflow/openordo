"use client"

import React, { useState, useTransition } from "react"
import { Plus, X, Download, Lock, Search } from "lucide-react"
import { currency, fmtDateShort, StatusBadge, toISO } from "@/components/DashboardHelpers"
import { createInvoiceAction, markInvoicePaidAction } from "@/server/actions/billing"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { ResponsiveTable, Pagination, CardKebab } from "@/components/ResponsiveTable"
import Link from "next/link"
import { PrescriptionPrintTemplate } from "../records/RecordsClient"

export function BillingClient({ 
  invoices, 
  patients, 
  clinic, 
  hasRevenueReports = false, 
  hasInsurance = false, 
  planName = "Practice",
  initialAction,
  initialPatientId,
  prescriptions,
  doctors
}: any) {
  const [printingInvoice, setPrintingInvoice] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
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

  const filtered = mappedInvoices.filter((i: any) => statusFilter === "all" || i.status.toLowerCase() === statusFilter)
    .filter((i: any) => {
      if (!searchTerm) return true
      const pName = patientName(i.patientId).toLowerCase()
      const invId = (i.displayId || "").toLowerCase()
      const q = searchTerm.toLowerCase()
      return pName.includes(q) || invId.includes(q)
    })
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

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

      <div className="cw-toolbar">
        <div className="cw-toolbar-left flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search invoices..." 
              value={searchTerm} 
              onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1)}}
              className="cw-input !pl-9 w-48 sm:w-64 !m-0 !py-1.5"
            />
          </div>
          <div className="cw-chip-filter">
            {["all", "paid", "unpaid"].map(s => (
              <button key={s} className={`cw-chip ${statusFilter === s ? "active" : ""}`} onClick={() => {setStatusFilter(s); setCurrentPage(1);}}>{s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
          {hasRevenueReports ? (
            <button className="cw-btn cw-btn-ghost cw-btn-sm hidden sm:flex" onClick={exportRevenueCSV} title="Export revenue report as CSV">
              <Download size={13} style={{ marginRight: 4 }} /> Revenue Report
            </button>
          ) : (
            <Link href="/dashboard/settings?tab=subscription" className="cw-btn cw-btn-ghost cw-btn-sm hidden sm:flex" style={{ textDecoration: "none", alignItems: "center", gap: 4, color: "var(--ink-soft)" }}>
              <Lock size={12} /> Revenue Reports (Clinic Group)
            </Link>
          )}
          <div className="sm:hidden flex items-center">
            <CardKebab>
              {hasRevenueReports ? (
                <button className="cw-dropdown-item flex items-center gap-2" onClick={exportRevenueCSV}><Download size={13} /> Revenue Report</button>
              ) : (
                <Link href="/dashboard/settings?tab=subscription" className="cw-dropdown-item flex items-center gap-2"><Lock size={12} /> Revenue Reports</Link>
              )}
            </CardKebab>
          </div>
          <button className="cw-btn cw-btn-primary cw-btn-sm w-full sm:w-auto justify-center" onClick={() => setModalOpen(true)} disabled={isPending}>
            <Plus size={15} /> New invoice
          </button>
        </div>
      </div>

      <div className="cw-panel">
        <ResponsiveTable
          table={
            <table className="cw-table cw-table-sticky-col">
              <thead><tr><th>Invoice</th><th>Patient</th><th>Date</th><th>Items</th><th>Amount</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {paginated.map((inv: any) => {
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
                            startTransition(async () => {
                              try {
                                const { getInvoicePdfUrlAction } = await import("@/server/actions/billing")
                                const url = await getInvoicePdfUrlAction(inv.displayId, inv.patientId)
                                if (url) {
                                  window.open(url, '_blank')
                                } else {
                                  setPrintingInvoice(inv)
                                  setTimeout(() => window.print(), 100)
                                }
                              } catch(e) {
                                setPrintingInvoice(inv)
                                setTimeout(() => window.print(), 100)
                              }
                            })
                          }} title="Download / Print Invoice"><Download size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          }
          cards={
            paginated.map((inv: any) => {
              const total = inv.items.reduce((s: number, it: any) => s + Number(it.amount), 0);
              return (
                <div key={inv.id} className="cw-stat-card flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="mono text-xs text-moss">{inv.displayId}</div>
                      <div className="font-semibold">{patientName(inv.patientId)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={inv.status} />
                      <CardKebab>
                        {inv.status.toLowerCase() === "unpaid" && (
                          <button className="cw-dropdown-item flex items-center gap-2" onClick={() => markPaid(inv.id)}>Mark paid</button>
                        )}
                        <button className="cw-dropdown-item flex items-center gap-2" onClick={() => {
                          startTransition(async () => {
                            try {
                              const { getInvoicePdfUrlAction } = await import("@/server/actions/billing")
                              const url = await getInvoicePdfUrlAction(inv.displayId, inv.patientId)
                              if (url) {
                                window.open(url, '_blank')
                              } else {
                                setPrintingInvoice(inv)
                                setTimeout(() => window.print(), 100)
                              }
                            } catch(e) {
                              setPrintingInvoice(inv)
                              setTimeout(() => window.print(), 100)
                            }
                          })
                        }}><Download size={13} /> Print/Download</button>
                      </CardKebab>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                    <div className="text-ink-soft">Date</div>
                    <div className="text-right num">{fmtDateShort(inv.date)}</div>
                    <div className="text-ink-soft">Amount</div>
                    <div className="text-right font-bold num">{currency(total)}</div>
                    <div className="text-ink-soft">Items</div>
                    <div className="text-right truncate">{inv.items.map((it: any) => it.desc).join(", ")}</div>
                  </div>
                </div>
              );
            })
          }
        />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {modalOpen && <InvoiceModal patients={patients} prescriptions={prescriptions} initialPatientId={initialPatientId} onClose={() => setModalOpen(false)} onSave={createInvoice} isPending={isPending} />}
      {printingInvoice && (
        <div id="print-root">
          <InvoicePrintTemplate 
            invoice={printingInvoice} 
            patient={patients.find((p: any) => p.id === printingInvoice.patientId)}
            clinic={clinic} 
          />
          {printingInvoice.prescription && (
            <div style={{ pageBreakBefore: "always" }}>
              <PrescriptionPrintTemplate
                record={printingInvoice.prescription}
                patient={patients.find((p: any) => p.id === printingInvoice.patientId)}
                doctor={printingInvoice.prescription.doctor}
                clinic={clinic}
              />
            </div>
          )}
        </div>
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
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", color: "#000", fontFamily: "sans-serif", background: "white" }}>
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

function InvoiceModal({ patients, prescriptions, onClose, onSave, isPending, initialPatientId }: any) {
  const [patientId, setPatientId] = useState(initialPatientId || patients[0]?.id || "");
  const today = new Date();
  const [date, setDate] = useState(toISO(today.getFullYear(), today.getMonth(), today.getDate()));
  const [items, setItems] = useState([{ desc: "", amount: "" }]);
  const [includePrescription, setIncludePrescription] = useState(false);

  const patientPrescriptions = prescriptions?.filter((p: any) => p.patientId === patientId) || [];
  const latestPrescription = patientPrescriptions[0];

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
          onSave({ 
            patientId, 
            date, 
            items: items.filter(it => it.desc && it.amount).map(it => ({ desc: it.desc, amount: Number(it.amount) })),
            includePrescriptionId: includePrescription && latestPrescription ? latestPrescription.id : null
          });
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
              <div key={i} className="flex flex-col sm:flex-row gap-2 mb-3 bg-paper-raised sm:bg-transparent p-3 sm:p-0 rounded border sm:border-0 border-line">
                <input className="cw-input w-full" placeholder="Description" value={it.desc} onChange={e => updateItem(i, "desc", e.target.value)} style={{ flex: 2 }} disabled={isPending} />
                <div className="flex gap-2 w-full" style={{ flex: 1 }}>
                  <input className="cw-input flex-1" type="number" placeholder="Amount" value={it.amount} onChange={e => updateItem(i, "amount", e.target.value)} disabled={isPending} />
                  {items.length > 1 && <button type="button" className="cw-btn cw-btn-ghost cw-btn-icon flex-shrink-0" onClick={() => setItems(items.filter((_, idx) => idx !== i))} disabled={isPending}><X size={14} /></button>}
                </div>
              </div>
            ))}
            <button type="button" className="cw-btn cw-btn-ghost cw-btn-sm" onClick={() => setItems([...items, { desc: "", amount: "" }])} disabled={isPending}><Plus size={13} />Add line item</button>
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>Total</span><span className="mono">{currency(total)}</span>
            </div>
            
            <div style={{ marginTop: 20, padding: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: latestPrescription ? "pointer" : "not-allowed", margin: 0, color: latestPrescription ? "var(--ink)" : "var(--ink-soft)" }}>
                <input 
                  type="checkbox" 
                  checked={includePrescription && !!latestPrescription} 
                  onChange={e => setIncludePrescription(e.target.checked)} 
                  disabled={isPending || !latestPrescription} 
                />
                Include latest e-prescription in PDF 
                {latestPrescription ? ` (${fmtDateShort(latestPrescription.date)})` : " (No prescription found)"}
              </label>
            </div>
          </div>
          <div className="cw-modal-foot flex flex-col sm:flex-row gap-2">
            <button type="button" className="cw-btn cw-btn-ghost cw-btn-sm w-full sm:w-auto justify-center" onClick={onClose} disabled={isPending}>Cancel</button>
            <button type="submit" className="cw-btn cw-btn-primary cw-btn-sm w-full sm:w-auto justify-center" disabled={isPending}>Create invoice</button>
          </div>
        </form>
      </div>
    </div>
  )
}
