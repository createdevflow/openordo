"use client"

import React, { useState, useTransition } from "react"
import Link from "next/link"
import { Search, Plus, FileSignature, Trash2, Printer, X, Pill, Calendar, User, Stethoscope } from "lucide-react"
import { createPrescriptionAction, deletePrescriptionAction } from "@/server/actions/prescriptions"
import { useConfirm } from "@/components/ui/ConfirmDialog"

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
            
            const res = await fetch("/api/upload", { method: "POST", body: formData })
            if (res.ok) {
              const json = await res.json()
              if (json.url) {
                const { createPatientDocumentAction } = await import("@/server/actions/documents")
                await createPatientDocumentAction({
                  patientId,
                  name: `Prescription ${result.prescription.id.substring(0, 6)}`,
                  type: "PRESCRIPTION",
                  sizeBytes: json.sizeBytes || file.size,
                  url: json.url
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

  const parseItems = (raw: string): PrescriptionItem[] => {
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  }

  return (
    <div className="cw" style={{ padding: "24px 28px", maxWidth: 1200, margin: "0 auto" }}>
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

      {/* Search Bar */}
      <div className="cw-toolbar" style={{ marginBottom: 20 }}>
        <div className="cw-search-box" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={15} color="#8B8A7E" />
          <input
            placeholder="Search by patient, doctor, or medication…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          Showing {filtered.length} of {prescriptions.length} prescriptions
        </span>
      </div>

      {/* Prescriptions List */}
      {filtered.length === 0 ? (
        <div className="cw-panel" style={{ padding: 48, textAlign: "center", background: "#fff", borderRadius: 12, border: "1px solid var(--sand-soft)" }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: "rgba(30,70,56,0.08)", color: "var(--forest)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <FileSignature size={24} />
          </div>
          <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>No prescriptions yet</h4>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--ink-soft)" }}>
            Issue your first digital e-prescription with medication dosage instructions.
          </p>
          <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={() => setIsNewModalOpen(true)}>
            <Plus size={14} /> Create Prescription
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
          {filtered.map(rx => {
            const rxItems = parseItems(rx.items)
            return (
              <div
                key={rx.id}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  border: "1px solid var(--sand-soft)",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                        {rx.patient?.name || "Patient"}
                      </h4>
                      <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                        ID: {rx.patient?.displayId || "—"} • {rx.patient?.age || "—"} yrs / {rx.patient?.gender || "—"}
                      </span>
                    </div>
                    <span style={{ fontSize: 11.5, background: "var(--sand-soft)", padding: "2px 8px", borderRadius: 6, fontWeight: 600, color: "var(--ink-soft)" }}>
                      {new Date(rx.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>

                  <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <Stethoscope size={13} color="var(--forest)" />
                    <span>Prescribed by <b>Dr. {rx.doctor?.name || "Clinic Doctor"}</b></span>
                  </div>

                  {/* Medicine Chips */}
                  <div style={{ background: "var(--sand-soft)", borderRadius: 8, padding: "8px 10px", marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <Pill size={11} color="var(--amber)" /> {rxItems.length} Medication{rxItems.length !== 1 ? "s" : ""}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: "var(--ink)", lineHeight: 1.4 }}>
                      {rxItems.map((item, idx) => (
                        <li key={idx} style={{ marginBottom: 3 }}>
                          <b>{item.drug}</b> — {item.dosage} ({item.frequency}, {item.durationDays}d)
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--sand-soft)", paddingTop: 10, marginTop: 4 }}>
                  <button
                    className="cw-btn cw-btn-ghost cw-btn-sm"
                    onClick={() => handleDeletePrescription(rx.id)}
                    style={{ color: "#B5432F", padding: "4px 8px" }}
                    title="Delete Prescription"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link href={`/dashboard/prescriptions/${rx.id}`}>
                      <button className="cw-btn cw-btn-ghost cw-btn-sm">
                        View Rx
                      </button>
                    </Link>
                    <button
                      className="cw-btn cw-btn-primary cw-btn-sm"
                      onClick={() => handlePrint(rx)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                    >
                      <Printer size={13} /> Print
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
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
              <button className="cw-btn cw-btn-ghost cw-btn-sm" onClick={() => setIsNewModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePrescription}>
              <div className="cw-modal-body">
                {/* Header Info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Patient *</label>
                  <select
                    className="cw-input"
                    value={patientId}
                    onChange={e => setPatientId(e.target.value)}
                    required
                  >
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.displayId})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Doctor *</label>
                  <select
                    className="cw-input"
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

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Prescription Date *</label>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink)" }}>
                    Medications & Dosages
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    style={{ fontSize: 12, color: "var(--forest)", background: "transparent", border: "none", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    <Plus size={13} /> Add Medicine
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "var(--sand-soft)",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid rgba(0,0,0,0.06)",
                        position: "relative"
                      }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 6 }}>
                        <div>
                          <input
                            placeholder="Medicine / Drug Name (e.g. Paracetamol 500mg)"
                            className="cw-input"
                            value={item.drug}
                            onChange={e => handleItemChange(idx, "drug", e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <input
                            placeholder="Dosage (e.g. 1 tab)"
                            className="cw-input"
                            value={item.dosage}
                            onChange={e => handleItemChange(idx, "dosage", e.target.value)}
                          />
                        </div>
                        <div>
                          <select
                            className="cw-input"
                            value={item.frequency}
                            onChange={e => handleItemChange(idx, "frequency", e.target.value)}
                          >
                            {FREQUENCY_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 32px", gap: 8, alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <input
                            type="number"
                            min={1}
                            max={365}
                            className="cw-input"
                            value={item.durationDays}
                            onChange={e => handleItemChange(idx, "durationDays", parseInt(e.target.value) || 1)}
                            style={{ width: "100%" }}
                          />
                          <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>days</span>
                        </div>
                        <div>
                          <input
                            placeholder="Instructions (e.g. After food / before sleep)"
                            className="cw-input"
                            value={item.notes || ""}
                            onChange={e => handleItemChange(idx, "notes", e.target.value)}
                          />
                        </div>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{ background: "transparent", border: "none", color: "#B5432F", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            title="Remove drug"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
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
