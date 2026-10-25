"use client"

import React, { useState, useTransition } from "react"
import Link from "next/link"
import { Search, Plus, FileSignature, Trash2, Printer, X, Pill, Calendar, User, Stethoscope, LayoutGrid, List } from "lucide-react"
import { createPrescriptionAction, deletePrescriptionAction } from "@/server/actions/prescriptions"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { ResponsiveTable, Pagination, CardKebab } from "@/components/ResponsiveTable"
import { initials, fmtDateShort } from "@/components/DashboardHelpers"

interface PrescriptionItem {
  drug: string
  dosage: string
  frequency: string
  durationDays: number
  notes?: string
}

const FREQUENCY_OPTIONS = [
  { value: "OD (1x daily)", label: "OD — Once daily" },
  { value: "BD (2x daily)", label: "BD — Twice daily" },
  { value: "TDS (3x daily)", label: "TDS — Three times daily" },
  { value: "QDS (4x daily)", label: "QDS — Four times daily" },
  { value: "PRN (as needed)", label: "PRN — As needed" },
  { value: "STAT (once)", label: "STAT — Immediately" },
]

export function PrescriptionsClient({
  prescriptions,
  patients,
  doctors,
  clinic,
  clinicEmail,
  initialAction,
  initialPatientId
}: {
  prescriptions: any[]
  patients: any[]
  doctors: any[]
  clinic: any
  clinicEmail?: string
  initialAction?: string
  initialPatientId?: string
}) {
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [isNewModalOpen, setIsNewModalOpen] = useState(initialAction === "new")
  const [previewPrescription, setPreviewPrescription] = useState<any | null>(null)
  const [isPending, startTransition] = useTransition()
  const { confirm, showAlert } = useConfirm()

  // Form State
  const [patientId, setPatientId] = useState(initialPatientId || patients[0]?.id || "")
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || "")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [generalNotes, setGeneralNotes] = useState("")
  const [items, setItems] = useState<PrescriptionItem[]>([
    { drug: "", dosage: "1 tab", frequency: "BD (2x daily)", durationDays: 5, notes: "After meals" }
  ])

  function handleAddItem() {
    setItems(prev => [
      ...prev,
      { drug: "", dosage: "1 tab", frequency: "BD (2x daily)", durationDays: 5, notes: "After meals" }
    ])
  }

  function handleRemoveItem(index: number) {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function handleItemChange(index: number, field: keyof PrescriptionItem, value: any) {
    setItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  function handleSavePrescription(e: React.FormEvent) {
    e.preventDefault()
    const validItems = items.filter(i => i.drug.trim().length > 0)
    if (validItems.length === 0) {
      showAlert({ title: "Missing Info", body: "Please enter at least one medication/drug name.", tone: "neutral" })
      return
    }

    startTransition(async () => {
      try {
        const result = await createPrescriptionAction({
          patientId,
          doctorId,
          date,
          items: validItems
        })
        
        // Secretly render the prescription to generate PDF
        if (result.success && result.prescription) {
          try {
            const html2pdf = (await import("html2pdf.js")).default
            const ReactDOMServer = (await import("react-dom/server")).default
            
            const rxPatient = patients.find((p: any) => p.id === patientId)
            const rxDoctor = doctors.find((d: any) => d.id === doctorId)
            
            const htmlString = ReactDOMServer.renderToString(
              <div style={{ padding: "30px", fontFamily: "system-ui, sans-serif", color: "#111" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #1E4638", paddingBottom: 16, marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--moss)", marginBottom: 2 }}>{clinic?.name || "Clinic"}</h2>
                    <div style={{ fontSize: 10.5, color: "#555", lineHeight: 1.4 }}>
                      {clinic?.address || "Address details"}<br />
                      Phone: {clinic?.phone || "+91 98765 43210"} • Email: {clinicEmail || "care@clinic.com"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <h3 style={{ margin: 0, fontSize: 16, color: "#1E4638" }}>Dr. {rxDoctor?.name}</h3>
                    <div style={{ fontSize: 12, color: "#666" }}>{rxDoctor?.specialty}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                      Date: {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                </div>

                <div style={{ background: "#F4F6F5", padding: "10px 14px", display: "flex", justifyContent: "space-between", marginBottom: 20, fontSize: 13, border: "1px solid #E5E7EB" }}>
                  <div><b>Patient:</b> {rxPatient?.name}</div>
                  <div><b>Age/Sex:</b> {rxPatient?.age || "—"} / {rxPatient?.gender || "—"}</div>
                  <div><b>Patient ID:</b> {rxPatient?.displayId || "—"}</div>
                </div>

                <div style={{ fontSize: 32, fontWeight: 900, color: "#1E4638", fontFamily: "serif", marginBottom: 12 }}>
                  ℞
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 30, fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #1E4638", textAlign: "left" }}>
                      <th style={{ padding: "8px 4px", width: "30px" }}>#</th>
                      <th style={{ padding: "8px" }}>Medicine / Drug</th>
                      <th style={{ padding: "8px" }}>Dosage</th>
                      <th style={{ padding: "8px" }}>Frequency</th>
                      <th style={{ padding: "8px" }}>Duration</th>
                      <th style={{ padding: "8px" }}>Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validItems.map((it, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #E5E7EB" }}>
                        <td style={{ padding: "8px 4px", fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ padding: "8px", fontWeight: 700, color: "#16241F" }}>{it.drug}</td>
                        <td style={{ padding: "8px" }}>{it.dosage}</td>
                        <td style={{ padding: "8px" }}>{it.frequency}</td>
                        <td style={{ padding: "8px" }}>{it.durationDays} Days</td>
                        <td style={{ padding: "8px", color: "#555" }}>{it.notes || "As directed"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
            
            const container = document.createElement("div")
            container.innerHTML = htmlString
            
            const pdfBlob = await html2pdf().from(container).outputPdf("blob")
            const file = new File([pdfBlob], `Prescription_${result.prescription.id.substring(0, 6)}.pdf`, { type: "application/pdf" })
            
            const formData = new FormData()
            formData.append("file", file)
            formData.append("category", "PATIENT_PRESCRIPTION")
            formData.append("patientId", patientId)
            
            const res = await fetch("/api/upload", { method: "POST", body: formData })
            if (res.ok) {
              const json = await res.json()
              if (json.id) {
                const { createPatientDocumentAction } = await import("@/server/actions/documents")
                await createPatientDocumentAction({
                  patientId,
                  name: `Prescription ${result.prescription.id.substring(0, 6)}`,
                  type: "PRESCRIPTION",
                  sizeBytes: json.sizeBytes || file.size,
                  url: json.id
                })
              }
            }
          } catch (pdfErr) {
            console.error("Failed to generate/upload prescription PDF:", pdfErr)
          }
        }

        setIsNewModalOpen(false)
        setItems([{ drug: "", dosage: "1 tab", frequency: "BD (2x daily)", durationDays: 5, notes: "After meals" }])
      } catch (err: any) {
        showAlert({ title: "Error", body: err.message || "Failed to create prescription", tone: "danger" })
      }
    })
  }

  async function handleDeletePrescription(id: string) {
    const ok = await confirm({ title: "Delete Prescription?", body: "Are you sure you want to delete this prescription?", tone: "danger" })
    if (!ok) return
    startTransition(async () => {
      await deletePrescriptionAction(id)
      if (previewPrescription?.id === id) {
        setPreviewPrescription(null)
      }
    })
  }

  function handlePrint(rx: any) {
    setPreviewPrescription(rx)
    setTimeout(() => {
      window.print()
    }, 150)
  }

  const filtered = prescriptions.filter(rx => {
    const pName = rx.patient?.name?.toLowerCase() || ""
    const dName = rx.doctor?.name?.toLowerCase() || ""
    const s = search.toLowerCase()
    return pName.includes(s) || dName.includes(s) || (rx.items && rx.items.toLowerCase().includes(s))
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const paginatedList = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const parseItems = (raw: string): PrescriptionItem[] => {
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  }

  const renderCardList = (list: any[]) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 360px), 1fr))", gap: 16 }}>
      {list.map(rx => {
        const rxItems = parseItems(rx.items)
        return (
          <div
            key={rx.id}
            className="cw-stat-card flex flex-col justify-between"
            style={{
              background: "#fff",
              borderRadius: 12,
              border: "1px solid var(--sand-soft)",
              padding: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="cw-avatar" style={{ background: rx.patient?.colorTag || "#1E4638", width: 34, height: 34, fontSize: 12 }}>
                    {initials(rx.patient?.name || "Patient")}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                      {rx.patient?.name || "Patient"}
                    </h4>
                    <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                      {rx.patient?.displayId ? `${rx.patient.displayId} • ` : ""}{rx.patient?.age ? `${rx.patient.age} yrs` : "—"} / {rx.patient?.gender || "—"}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 11.5, background: "var(--sand-soft)", padding: "2px 8px", borderRadius: 6, fontWeight: 600, color: "var(--ink-soft)" }}>
                  {fmtDateShort(rx.date)}
                </span>
              </div>

              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Stethoscope size={13} color="var(--forest)" />
                <span>Prescribed by <b>Dr. {rx.doctor?.name || "Clinic Doctor"}</b></span>
              </div>

              {/* Medicine Chips */}
              <div style={{ background: "var(--sand-soft)", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                  <Pill size={12} color="var(--forest)" /> {rxItems.length} Medication{rxItems.length !== 1 ? "s" : ""}
                </div>
                <div className="flex flex-col gap-2">
                  {rxItems.map((item, idx) => (
                    <div key={idx} className="text-xs flex flex-wrap items-baseline justify-between gap-1 border-b border-line/40 pb-1.5 last:border-0 last:pb-0">
                      <div>
                        <span className="font-bold text-ink">{item.drug}</span>
                        {item.dosage && <span className="text-ink-soft ml-1.5 font-normal">({item.dosage})</span>}
                      </div>
                      <span className="text-[11px] font-medium text-forest bg-forest/8 px-1.5 py-0.5 rounded">
                        {item.frequency} · {item.durationDays}d
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--sand-soft)", paddingTop: 10, marginTop: 4 }}>
              <button
                className="cw-btn cw-btn-ghost cw-btn-icon"
                onClick={() => handleDeletePrescription(rx.id)}
                style={{ color: "#B5432F", width: 28, height: 28, padding: 0 }}
                title="Delete Prescription"
              >
                <Trash2 size={14} />
              </button>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Link 
                  href={`/dashboard/prescriptions/${rx.id}`}
                  className="cw-btn cw-btn-ghost cw-btn-sm"
                  style={{ width: "78px", height: "28px", padding: 0, fontSize: "11.5px", fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", borderRadius: 6, flexShrink: 0 }}
                >
                  View Rx
                </Link>
                <button
                  className="cw-btn cw-btn-primary cw-btn-sm"
                  onClick={() => handlePrint(rx)}
                  style={{ width: "78px", height: "28px", padding: 0, fontSize: "11.5px", fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 6, flexShrink: 0 }}
                >
                  <Printer size={12} /> Print
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const thisMonthCount = prescriptions.filter((rx: any) => {
    const d = new Date(rx.date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }).length
  const uniquePatientsCount = new Set(prescriptions.map((rx: any) => rx.patientId)).size
  const totalCount = prescriptions.length

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "var(--ink)" }}>E-Prescriptions</h1>
            <span style={{ fontSize: 11, background: "rgba(30,70,56,0.1)", color: "var(--forest)", fontWeight: 700, padding: "3px 8px", borderRadius: 12 }}>
              Add-on Active
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-soft)" }}>
            Issue and print digital prescriptions with structured dosages and custom clinical letterheads.
          </p>
        </div>
        <button
          className="cw-btn cw-btn-primary cw-btn-sm"
          onClick={() => setIsNewModalOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={15} /> New Prescription
        </button>
      </div>

      {/* Stats - matching Reference Image */}
      <div className="cw-stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 22 }}>
        <div className="cw-stat-card">
          <div className="val" style={{ color: "var(--forest)" }}>{totalCount}</div>
          <div className="lbl">Total prescriptions</div>
        </div>
        <div className="cw-stat-card">
          <div className="val" style={{ color: "var(--amber)" }}>{thisMonthCount}</div>
          <div className="lbl">Issued this month</div>
        </div>
        <div className="cw-stat-card">
          <div className="val">{uniquePatientsCount}</div>
          <div className="lbl">Patients prescribed</div>
        </div>
      </div>

      {/* Search Bar & View Mode Toggle */}
      <div className="cw-toolbar" style={{ marginBottom: 16 }}>
        <div className="relative w-full sm:w-auto flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft w-4 h-4" />
          <input
            type="text"
            placeholder="Search by patient, doctor, or medication…"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="cw-input !pl-9 w-64 sm:w-80 !m-0 !py-1.5"
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
            Showing {filtered.length} of {prescriptions.length} prescriptions
          </span>
          <div className="hidden sm:flex items-center bg-sand-soft rounded-lg p-0.5 border border-line">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === "table" ? "bg-white shadow-xs text-forest font-semibold" : "text-ink-soft hover:text-ink"}`}
              title="Table view"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === "grid" ? "bg-white shadow-xs text-forest font-semibold" : "text-ink-soft hover:text-ink"}`}
              title="Grid view"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Prescriptions Content */}
      {filtered.length === 0 ? (
        <div className="cw-panel"><div className="cw-empty">
          <div className="icon"><FileSignature size={20} /></div>
          <h4>No prescriptions found</h4>
          <p>Issue your first digital e-prescription with medication dosage instructions.</p>
        </div></div>
      ) : viewMode === "grid" ? (
        <div>
          {renderCardList(paginatedList)}
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      ) : (
        <div className="cw-panel">
          <ResponsiveTable
            table={
              <table className="cw-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Doctor</th>
                    <th>Prescribed Medications</th>
                    <th>Total Items</th>
                    <th style={{ textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((rx: any) => {
                    const rxItems = parseItems(rx.items)
                    return (
                      <tr key={rx.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="cw-avatar" style={{ background: rx.patient?.colorTag || "#1E4638", width: 28, height: 28, fontSize: 11 }}>
                              {initials(rx.patient?.name || "Patient")}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{rx.patient?.name || "Patient"}</div>
                              {rx.patient?.displayId && (
                                <div className="mono" style={{ fontSize: 11, color: "var(--moss)" }}>
                                  {rx.patient.displayId}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="num font-medium" style={{ fontSize: 13 }}>
                          {fmtDateShort(rx.date)}
                        </td>
                        <td style={{ fontSize: 13, color: "var(--ink)" }}>
                          Dr. {rx.doctor?.name || "Clinic Doctor"}
                        </td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 300 }}>
                            {rxItems.slice(0, 3).map((it, i) => (
                              <span key={i} style={{ fontSize: 11, background: "rgba(30,70,56,0.08)", color: "var(--forest)", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                                {it.drug} <span style={{ opacity: 0.75, fontWeight: 400 }}>({it.dosage})</span>
                              </span>
                            ))}
                            {rxItems.length > 3 && (
                              <span style={{ fontSize: 11, background: "var(--sand-soft)", color: "var(--ink-soft)", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                                +{rxItems.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 500 }}>
                            {rxItems.length} med{rxItems.length !== 1 ? "s" : ""}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                            <Link 
                              href={`/dashboard/prescriptions/${rx.id}`}
                              className="cw-btn cw-btn-ghost cw-btn-sm"
                              style={{ width: "78px", height: "28px", padding: 0, fontSize: "11.5px", fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", borderRadius: 6, flexShrink: 0 }}
                            >
                              View Rx
                            </Link>
                            <button
                              className="cw-btn cw-btn-primary cw-btn-sm"
                              onClick={() => handlePrint(rx)}
                              style={{ width: "78px", height: "28px", padding: 0, fontSize: "11.5px", fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 6, flexShrink: 0 }}
                            >
                              <Printer size={12} /> Print
                            </button>
                            <CardKebab direction="auto">
                              <Link
                                href={`/dashboard/prescriptions/${rx.id}`}
                                className="cw-dropdown-item flex items-center gap-2"
                              >
                                <FileSignature size={13} /> View Full Rx
                              </Link>
                              <button
                                className="cw-dropdown-item flex items-center gap-2"
                                onClick={() => handlePrint(rx)}
                              >
                                <Printer size={13} /> Print Prescription
                              </button>
                              <button
                                className="cw-dropdown-item text-red-600 flex items-center gap-2"
                                onClick={() => handleDeletePrescription(rx.id)}
                              >
                                <Trash2 size={13} /> Delete Prescription
                              </button>
                            </CardKebab>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            }
            cards={renderCardList(paginatedList)}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* New Prescription Modal */}
      {isNewModalOpen && (
        <div className="cw-overlay" onClick={() => setIsNewModalOpen(false)}>
          <div className="cw-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="cw-modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileSignature size={20} color="var(--forest)" />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>New E-Prescription</h3>
              </div>
              <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={() => setIsNewModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePrescription}>
              <div className="cw-modal-body">
                {/* Header Info */}
                <div className="cw-row2">
                  <div className="cw-field">
                    <label>Patient *</label>
                    <select
                      className="cw-select"
                      value={patientId}
                      onChange={e => setPatientId(e.target.value)}
                      required
                    >
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.displayId ? `(${p.displayId})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="cw-field">
                    <label>Doctor *</label>
                    <select
                      className="cw-select"
                      value={doctorId}
                      onChange={e => setDoctorId(e.target.value)}
                      required
                    >
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>
                          Dr. {d.name} {d.specialty ? `(${d.specialty})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="cw-field" style={{ marginBottom: 16 }}>
                  <label>Prescription Date *</label>
                  <input
                    type="date"
                    className="cw-input"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                  />
                </div>

                {/* Medication Line Items */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Pill size={14} color="var(--forest)" /> Medications & Dosages
                    </label>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="cw-btn cw-btn-ghost cw-btn-sm"
                      style={{ fontSize: 12, color: "var(--forest)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px" }}
                    >
                      <Plus size={13} /> Add Medicine
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "var(--sand-soft)",
                          padding: "12px 14px",
                          borderRadius: 8,
                          border: "1px solid rgba(0,0,0,0.06)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--forest)" }}>
                            Medication #{idx + 1}
                          </span>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              style={{ background: "transparent", border: "none", color: "#B5432F", cursor: "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}
                              title="Remove medication"
                            >
                              <Trash2 size={13} /> Remove
                            </button>
                          )}
                        </div>

                        <div className="cw-field" style={{ marginBottom: 8 }}>
                          <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>Medicine / Drug Name *</label>
                          <input
                            placeholder="e.g. Paracetamol 500mg, Amoxicillin"
                            className="cw-input"
                            value={item.drug}
                            onChange={e => handleItemChange(idx, "drug", e.target.value)}
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-2">
                          <div className="cw-field" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>Dosage</label>
                            <input
                              placeholder="e.g. 1 tab / 5ml"
                              className="cw-input"
                              value={item.dosage}
                              onChange={e => handleItemChange(idx, "dosage", e.target.value)}
                            />
                          </div>
                          <div className="cw-field" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>Frequency</label>
                            <select
                              className="cw-select"
                              value={item.frequency}
                              onChange={e => handleItemChange(idx, "frequency", e.target.value)}
                            >
                              {FREQUENCY_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="cw-field" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>Duration (Days)</label>
                            <input
                              type="number"
                              min={1}
                              max={365}
                              className="cw-input"
                              value={item.durationDays}
                              onChange={e => handleItemChange(idx, "durationDays", parseInt(e.target.value) || 1)}
                            />
                          </div>
                        </div>

                        <div className="cw-field" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>Special Instructions</label>
                          <input
                            placeholder="e.g. After meals / with warm water"
                            className="cw-input"
                            value={item.notes || ""}
                            onChange={e => handleItemChange(idx, "notes", e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="cw-modal-foot">
                <button
                  type="button"
                  className="cw-btn cw-btn-ghost cw-btn-sm"
                  onClick={() => setIsNewModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cw-btn cw-btn-primary cw-btn-sm"
                  disabled={isPending}
                >
                  {isPending ? "Saving..." : "Save & Generate PDF"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden container for printing */}
      {previewPrescription && (
        <div id="print-root">
          <div style={{ padding: "30px", fontFamily: "system-ui, sans-serif", color: "#111" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #1E4638", paddingBottom: 16, marginBottom: 16 }}>
              <div>
                <h1 style={{ margin: "0 0 4px", fontSize: 22, color: "#1E4638" }}>{clinic?.name || "OpenORDO Medical Centre"}</h1>
                <div style={{ fontSize: 12, color: "#555" }}>
                  {clinic?.address || "Health Plaza, Level 2"}<br />
                  Phone: {clinic?.phone || "+91 98765 43210"} • Email: {clinicEmail || "care@clinic.com"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <h3 style={{ margin: 0, fontSize: 16, color: "#1E4638" }}>Dr. {previewPrescription.doctor?.name}</h3>
                <div style={{ fontSize: 12, color: "#666" }}>{previewPrescription.doctor?.specialty}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                  Date: {new Date(previewPrescription.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              </div>
            </div>

            <div style={{ background: "#F4F6F5", padding: "10px 14px", display: "flex", justifyContent: "space-between", marginBottom: 20, fontSize: 13, border: "1px solid #E5E7EB" }}>
              <div><b>Patient:</b> {previewPrescription.patient?.name}</div>
              <div><b>Age/Sex:</b> {previewPrescription.patient?.age || "—"} / {previewPrescription.patient?.gender || "—"}</div>
              <div><b>Patient ID:</b> {previewPrescription.patient?.displayId || "—"}</div>
            </div>

            <div style={{ fontSize: 32, fontWeight: 900, color: "#1E4638", fontFamily: "serif", marginBottom: 12 }}>
              ℞
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 30, fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #1E4638", textAlign: "left" }}>
                  <th style={{ padding: "8px 4px", width: "30px" }}>#</th>
                  <th style={{ padding: "8px" }}>Medicine / Drug</th>
                  <th style={{ padding: "8px" }}>Dosage</th>
                  <th style={{ padding: "8px" }}>Frequency</th>
                  <th style={{ padding: "8px" }}>Duration</th>
                  <th style={{ padding: "8px" }}>Instructions</th>
                </tr>
              </thead>
              <tbody>
                {parseItems(previewPrescription.items).map((it, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #E5E7EB" }}>
                    <td style={{ padding: "8px 4px" }}>{i + 1}</td>
                    <td style={{ padding: "8px", fontWeight: 700 }}>{it.drug}</td>
                    <td style={{ padding: "8px" }}>{it.dosage}</td>
                    <td style={{ padding: "8px" }}>{it.frequency}</td>
                    <td style={{ padding: "8px" }}>{it.durationDays} Days</td>
                    <td style={{ padding: "8px" }}>{it.notes || "As directed"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 60, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontSize: 11, color: "#777" }}>
                Valid digital prescription issued via OpenORDO E-Prescriptions.
              </div>
              <div style={{ textAlign: "center", minWidth: 180 }}>
                <div style={{ borderBottom: "1px solid #000", height: 40 }}></div>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Dr. {previewPrescription.doctor?.name}</div>
                <div style={{ fontSize: 11, color: "#666" }}>Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
