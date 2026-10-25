"use client"

import React, { useState, useTransition } from "react"
import Link from "next/link"
import { getFileUrl } from "@/lib/file-utils"
import { Search, Plus, FileText, X, Download, Printer, Trash2, Stethoscope, User } from "lucide-react"
import { fmtDate, fmtDateShort, toISO, initials } from "@/components/DashboardHelpers"
import { createRecordAction, deleteRecordAction } from "@/server/actions/records"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { ResponsiveTable, Pagination, CardKebab } from "@/components/ResponsiveTable"
import imageCompression from "browser-image-compression"

export function RecordsClient({ records, patients, doctors, clinic }: any) {
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [modalOpen, setModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [printingRecord, setPrintingRecord] = useState<any>(null)
  const { confirm, showAlert } = useConfirm()

  const patientName = (id: string) => patients.find((p: any) => p.id === id)?.name || "Unknown"
  const patientObj = (id: string) => patients.find((p: any) => p.id === id)
  const doctorName = (id: string) => doctors.find((d: any) => d.id === id)?.name || "Unknown"

  const filtered = records
    .filter((r: any) => {
      const pName = patientName(r.patientId).toLowerCase()
      const diag = (r.diagnosis || "").toLowerCase()
      const doc = doctorName(r.doctorId).toLowerCase()
      const s = search.toLowerCase()
      return pName.includes(s) || diag.includes(s) || doc.includes(s)
    })
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const thisMonthCount = records.filter((r: any) => {
    const d = new Date(r.date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }).length
  const uniquePatientsCount = new Set(records.map((r: any) => r.patientId)).size
  const totalCount = records.length

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const paginatedList = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  async function handleDeleteRecord(id: string) {
    const ok = await confirm({
      title: "Delete Medical Record?",
      body: "Are you sure you want to delete this medical record? This action cannot be undone.",
      tone: "danger"
    })
    if (!ok) return

    startTransition(async () => {
      try {
        await deleteRecordAction(id)
        if (printingRecord?.id === id) setPrintingRecord(null)
      } catch (err) {
        console.error(err)
        showAlert({ title: "Error", body: "Failed to delete record", tone: "danger" })
      }
    })
  }

  function handlePrint(record: any) {
    setPrintingRecord(record)
    setTimeout(() => {
      window.print()
    }, 150)
  }

  async function saveRecord(data: any, file: File | null) {
    let documentUrl = ""
    let documentSize: number | undefined = undefined
    let documentName: string | undefined = undefined

    if (file) {
      setIsUploading(true)
      try {
        let fileToUpload = file
        if (file.type.startsWith("image/")) {
          const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true }
          fileToUpload = await imageCompression(file, options)
        }
        
        const formData = new FormData()
        formData.append("file", fileToUpload)
        formData.append("category", "PATIENT_RECORD_ATTACHMENT")
        formData.append("patientId", data.patientId)

        const res = await fetch("/api/upload", { method: "POST", body: formData })
        if (!res.ok) throw new Error("Upload failed")
        
        const json = await res.json()
        documentUrl = json.id
        documentSize = json.sizeBytes
        documentName = json.originalFilename
      } catch (err) {
        console.error(err)
        showAlert({ title: "Upload Failed", body: "Failed to upload document", tone: "danger" })
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    }

    startTransition(async () => {
      try {
        await createRecordAction({ ...data, documentUrl, documentSize, documentName })
        setModalOpen(false)
      } catch (err) {
        console.error(err)
        showAlert({ title: "Error", body: "Failed to save record", tone: "danger" })
      }
    })
  }

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "var(--ink)" }}>Medical Records</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-soft)" }}>
            Patient clinical histories, visit diagnoses, prescriptions, and attached documents.
          </p>
        </div>
        <button 
          className="cw-btn cw-btn-primary cw-btn-sm" 
          onClick={() => setModalOpen(true)} 
          disabled={isPending || isUploading}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={15} /> New Record
        </button>
      </div>

      {/* Stats - matching Reference Image */}
      <div className="cw-stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 22 }}>
        <div className="cw-stat-card">
          <div className="val" style={{ color: "var(--forest)" }}>{totalCount}</div>
          <div className="lbl">Total medical records</div>
        </div>
        <div className="cw-stat-card">
          <div className="val" style={{ color: "var(--amber)" }}>{thisMonthCount}</div>
          <div className="lbl">Added this month</div>
        </div>
        <div className="cw-stat-card">
          <div className="val">{uniquePatientsCount}</div>
          <div className="lbl">Patients on record</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="cw-toolbar" style={{ marginBottom: 16 }}>
        <div className="relative w-full sm:w-auto flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft w-4 h-4" />
          <input 
            type="text"
            placeholder="Search by patient, doctor, or diagnosis…" 
            value={search} 
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} 
            className="cw-input !pl-9 w-64 sm:w-80 !m-0 !py-1.5"
          />
        </div>
        <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          Showing {filtered.length} of {records.length} records
        </span>
      </div>

      {/* Content in cw-panel */}
      {filtered.length === 0 ? (
        <div className="cw-panel"><div className="cw-empty">
          <div className="icon"><FileText size={20} /></div>
          <h4>No medical records found</h4>
          <p>Records added during a patient visit will appear here, organized by patient and date.</p>
        </div></div>
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
                    <th>Diagnosis</th>
                    <th>Prescription & Notes</th>
                    <th>Attachment</th>
                    <th style={{ textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((r: any) => {
                    const p = patientObj(r.patientId)
                    return (
                      <tr key={r.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="cw-avatar" style={{ background: p?.colorTag || "#1E4638", width: 28, height: 28, fontSize: 11 }}>
                              {initials(patientName(r.patientId))}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{patientName(r.patientId)}</div>
                              {p?.displayId && (
                                <div className="mono" style={{ fontSize: 11, color: "var(--moss)" }}>{p.displayId}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="num" style={{ fontSize: 13 }}>
                          {fmtDateShort(r.date)}
                        </td>
                        <td style={{ fontSize: 13, color: "var(--ink)" }}>
                          Dr. {doctorName(r.doctorId)}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>
                            {r.diagnosis}
                          </span>
                        </td>
                        <td style={{ fontSize: 12.5 }}>
                          {r.prescription && (
                            <div style={{ color: "var(--forest)", fontWeight: 600, marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 10, background: "rgba(30,70,56,0.1)", padding: "1px 5px", borderRadius: 4 }}>Rx</span>
                              <span className="truncate max-w-[220px]" title={r.prescription}>{r.prescription}</span>
                            </div>
                          )}
                          {r.notes ? (
                            <div style={{ color: "var(--ink-soft)", fontSize: 12 }} className="truncate max-w-[220px]" title={r.notes}>
                              {r.notes}
                            </div>
                          ) : !r.prescription ? (
                            <span style={{ color: "var(--ink-soft)" }}>—</span>
                          ) : null}
                        </td>
                        <td>
                          {r.documentUrl ? (
                            <a
                              href={getFileUrl(r.documentUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="cw-btn cw-btn-ghost cw-btn-sm"
                              style={{ padding: "3px 8px", fontSize: 11.5, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", color: "var(--forest)" }}
                            >
                              <FileText size={13} /> View File
                            </a>
                          ) : (
                            <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>None</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                            <button
                              className="cw-btn cw-btn-ghost cw-btn-sm"
                              onClick={() => handlePrint(r)}
                              style={{ width: "78px", height: "28px", padding: 0, fontSize: "11.5px", fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 6, flexShrink: 0 }}
                              title="Print Prescription"
                            >
                              <Printer size={12} /> Print Rx
                            </button>
                            <CardKebab direction="auto">
                              <button
                                className="cw-dropdown-item flex items-center gap-2"
                                onClick={() => handlePrint(r)}
                              >
                                <Printer size={13} /> Print Rx
                              </button>
                              {r.documentUrl && (
                                <a
                                  href={getFileUrl(r.documentUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="cw-dropdown-item flex items-center gap-2"
                                >
                                  <FileText size={13} /> View Attached File
                                </a>
                              )}
                              <Link
                                href={`/dashboard/patients?search=${patientName(r.patientId)}`}
                                className="cw-dropdown-item flex items-center gap-2"
                              >
                                <User size={13} /> View Patient
                              </Link>
                              <button
                                className="cw-dropdown-item text-red-600 flex items-center gap-2"
                                onClick={() => handleDeleteRecord(r.id)}
                              >
                                <Trash2 size={13} /> Delete Record
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
            cards={
              paginatedList.map((r: any) => {
                const p = patientObj(r.patientId)
                return (
                  <div key={r.id} className="cw-stat-card flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="cw-avatar" style={{ background: p?.colorTag || "#1E4638", width: 34, height: 34, fontSize: 12 }}>
                          {initials(patientName(r.patientId))}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{patientName(r.patientId)}</div>
                          <div className="text-xs text-ink-soft">Dr. {doctorName(r.doctorId)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-sand-soft px-2 py-0.5 rounded text-ink-soft font-medium">
                          {fmtDateShort(r.date)}
                        </span>
                        <CardKebab direction="auto">
                          <button className="cw-dropdown-item flex items-center gap-2" onClick={() => handlePrint(r)}>
                            <Printer size={13} /> Print Rx
                          </button>
                          {r.documentUrl && (
                            <a href={getFileUrl(r.documentUrl)} target="_blank" rel="noreferrer" className="cw-dropdown-item flex items-center gap-2">
                              <FileText size={13} /> View Attached File
                            </a>
                          )}
                          <button className="cw-dropdown-item text-red-600 flex items-center gap-2" onClick={() => handleDeleteRecord(r.id)}>
                            <Trash2 size={13} /> Delete
                          </button>
                        </CardKebab>
                      </div>
                    </div>

                    <div className="bg-sand-soft/50 rounded-lg p-2.5 border border-line/50 text-xs flex flex-col gap-1.5">
                      <div>
                        <span className="text-ink-soft uppercase text-[10px] font-bold tracking-wider">Diagnosis:</span>{" "}
                        <span className="font-semibold text-ink">{r.diagnosis}</span>
                      </div>
                      {r.prescription && (
                        <div>
                          <span className="text-ink-soft uppercase text-[10px] font-bold tracking-wider">Prescription:</span>{" "}
                          <span className="text-forest font-medium">{r.prescription}</span>
                        </div>
                      )}
                      {r.notes && (
                        <div className="text-ink-soft">
                          {r.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-line/60">
                      <div>
                        {r.documentUrl ? (
                          <a href={getFileUrl(r.documentUrl)} target="_blank" rel="noreferrer" className="text-forest font-semibold text-xs inline-flex items-center gap-1.5 hover:underline">
                            <FileText size={13} /> Document Attached
                          </a>
                        ) : (
                          <span className="text-ink-soft text-xs">No attachment</span>
                        )}
                      </div>
                      <button
                        className="cw-btn cw-btn-ghost cw-btn-sm"
                        onClick={() => handlePrint(r)}
                        style={{ height: 28, padding: "0 10px", fontSize: 11.5, display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <Printer size={12} /> Print Rx
                      </button>
                    </div>
                  </div>
                )
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
      )}

      {modalOpen && <RecordModal patients={patients} doctors={doctors} onClose={() => setModalOpen(false)} onSave={saveRecord} isPending={isPending || isUploading} />}
      
      {printingRecord && (
        <div id="print-root">
          <PrescriptionPrintTemplate 
            record={printingRecord}
            patient={patients.find((p: any) => p.id === printingRecord.patientId)}
            doctor={doctors.find((d: any) => d.id === printingRecord.doctorId)}
            clinic={clinic}
          />
        </div>
      )}
    </div>
  )
}

export function PrescriptionPrintTemplate({ record, clinic, patient, doctor }: any) {
  let config: any = {};
  try {
    config = JSON.parse(clinic.billingConfig || "{}");
  } catch(e) {}
  
  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", color: "#000", fontFamily: "sans-serif", background: "white" }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "3px solid var(--forest)", paddingBottom: "20px", marginBottom: "30px" }}>
        <div style={{ flex: 1 }}>
          {config.invoiceLogo ? (
            <img src={config.invoiceLogo} alt="Logo" style={{ maxHeight: 60, marginBottom: 10 }} />
          ) : (
            <h1 style={{ margin: 0, fontSize: 24, color: "var(--forest)" }}>{clinic?.name}</h1>
          )}
          <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
            {clinic?.address}<br />
            {clinic?.phone && <span>Phone: {clinic.phone}<br /></span>}
          </div>
        </div>
        <div style={{ textAlign: "right", flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: "#333" }}>Dr. {doctor?.name}</h2>
          <div style={{ marginTop: 4, fontSize: 13, color: "#555" }}>
            {doctor?.specialty}<br />
            <strong>Date:</strong> {fmtDate(record.date)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px", background: "#f9f9f9", padding: "16px", borderRadius: "8px", border: "1px solid #eee" }}>
        <div>
          <div style={{ fontSize: 12, textTransform: "uppercase", color: "#888", marginBottom: 4 }}>Patient Name</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{patient?.name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", color: "#888", marginBottom: 4 }}>Diagnosis</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{record.diagnosis}</div>
        </div>
      </div>

      <div style={{ marginBottom: "60px" }}>
        <div style={{ fontSize: 28, fontFamily: "serif", fontWeight: 700, color: "var(--forest)", marginBottom: 20 }}>Rx</div>
        <div style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {record.prescription || "No prescription issued."}
        </div>
      </div>

      {record.notes && (
        <div style={{ marginBottom: "60px" }}>
          <h3 style={{ fontSize: 14, textTransform: "uppercase", color: "#888", borderBottom: "1px solid #eee", paddingBottom: 4, marginBottom: 12 }}>Clinical Notes</h3>
          <div style={{ fontSize: 14, color: "#444", whiteSpace: "pre-wrap" }}>{record.notes}</div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 100 }}>
        <div style={{ textAlign: "center", width: 250 }}>
          <div style={{ borderTop: "1px solid #333", paddingTop: 8, fontSize: 14, fontWeight: 600 }}>
            Signature / Dr. {doctor?.name}
          </div>
        </div>
      </div>
    </div>
  )
}

function RecordModal({ patients, doctors, onClose, onSave, isPending }: any) {
  const today = new Date();
  const [form, setForm] = useState({ 
    patientId: patients[0]?.id || "", 
    doctorId: doctors[0]?.id || "", 
    date: toISO(today.getFullYear(), today.getMonth(), today.getDate()), 
    diagnosis: "", 
    prescription: "", 
    notes: "" 
  });
  const [file, setFile] = useState<File | null>(null)

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="cw-overlay" onClick={onClose}>
      <div className="cw-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="cw-modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={18} color="var(--forest)" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>New Medical Record</h3>
          </div>
          <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={onClose} disabled={isPending}><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form, file); }}>
          <div className="cw-modal-body">
            <div className="cw-row2">
              <div className="cw-field">
                <label>Patient *</label>
                <select className="cw-select" value={form.patientId} onChange={set("patientId")} disabled={isPending} required>
                  {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name} {p.displayId ? `(${p.displayId})` : ""}</option>)}
                </select>
              </div>
              <div className="cw-field">
                <label>Doctor *</label>
                <select className="cw-select" value={form.doctorId} onChange={set("doctorId")} disabled={isPending} required>
                  {doctors.map((d: any) => <option key={d.id} value={d.id}>Dr. {d.name} {d.specialty ? `(${d.specialty})` : ""}</option>)}
                </select>
              </div>
            </div>

            <div className="cw-row2">
              <div className="cw-field">
                <label>Visit Date *</label>
                <input className="cw-input" type="date" value={form.date} onChange={set("date")} required disabled={isPending} />
              </div>
              <div className="cw-field">
                <label>Diagnosis *</label>
                <input className="cw-input" value={form.diagnosis} onChange={set("diagnosis")} required placeholder="e.g. Acute bronchitis" disabled={isPending} />
              </div>
            </div>

            <div className="cw-field">
              <label>Prescription / Rx</label>
              <input className="cw-input" value={form.prescription} onChange={set("prescription")} placeholder="e.g. Azithromycin 500mg, once daily, 3 days" disabled={isPending} />
            </div>

            <div className="cw-field">
              <label>Clinical Notes</label>
              <textarea className="cw-textarea" rows={3} value={form.notes} onChange={set("notes")} placeholder="Observations, vitals, follow-up plan…" disabled={isPending} />
            </div>

            <div className="cw-field">
              <label>Attach Document (Optional)</label>
              <input type="file" className="cw-input" onChange={e => setFile(e.target.files?.[0] || null)} disabled={isPending} accept="image/*,.pdf" />
              <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>
                Accepted: PDF, PNG, JPG. Images are automatically compressed before upload.
              </div>
            </div>
          </div>
          <div className="cw-modal-foot">
            <button type="button" className="cw-btn cw-btn-ghost cw-btn-sm" onClick={onClose} disabled={isPending}>Cancel</button>
            <button type="submit" className="cw-btn cw-btn-primary cw-btn-sm" disabled={isPending}>{isPending ? "Saving..." : "Save Record"}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
