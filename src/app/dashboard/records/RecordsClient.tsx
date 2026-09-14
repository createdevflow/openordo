"use client"

import React, { useState, useTransition } from "react"
import { Search, Plus, FileText, X, Download } from "lucide-react"
import { fmtDate, toISO } from "@/components/DashboardHelpers"
import { createRecordAction } from "@/server/actions/records"
import { useConfirm } from "@/components/ui/ConfirmDialog"

import imageCompression from "browser-image-compression"

export function RecordsClient({ records, patients, doctors, clinic }: any) {
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [printingRecord, setPrintingRecord] = useState<any>(null)
  const { showAlert } = useConfirm()

  const patientName = (id: string) => patients.find((p: any) => p.id === id)?.name || "Unknown"
  const doctorName = (id: string) => doctors.find((d: any) => d.id === id)?.name || "Unknown"

  const filtered = records
    .filter((r: any) => patientName(r.patientId).toLowerCase().includes(search.toLowerCase()) || r.diagnosis.toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

  async function saveRecord(data: any, file: File | null) {
    let documentUrl = ""

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

        const res = await fetch("/api/upload", { method: "POST", body: formData })
        if (!res.ok) throw new Error("Upload failed")
        
        const json = await res.json()
        documentUrl = json.url
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
        await createRecordAction({ ...data, documentUrl })
        setModalOpen(false)
      } catch (err) {
        console.error(err)
        showAlert({ title: "Error", body: "Failed to save record", tone: "danger" })
      }
    })
  }

  return (
    <div>
      <div className="cw-toolbar">
        <div className="cw-search-box">
          <Search size={15} color="#8B8A7E" />
          <input placeholder="Search by patient or diagnosis…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={() => setModalOpen(true)} disabled={isPending || isUploading}>
          <Plus size={15} />New record
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="cw-panel"><div className="cw-empty">
          <div className="icon"><FileText size={20} /></div>
          <h4>No medical records found</h4>
          <p>Records added during a visit will appear here, organized by patient.</p>
        </div></div>
      ) : filtered.map((r: any) => (
        <div className="cw-record-card" key={r.id}>
          <div className="rhead">
            <div>
              <span style={{ fontWeight: 700, fontSize: 14.5 }}>{patientName(r.patientId)}</span>
              <span style={{ fontSize: 12.5, color: "var(--ink-soft)", marginLeft: 8 }}>{r.diagnosis}</span>
            </div>
            <span className="rdate">{fmtDate(r.date)}</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 4 }}><b>Prescription:</b> {r.prescription || "None"}</div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{r.notes || ""}</div>
          {r.documentUrl && (
            <div style={{ fontSize: 12.5, marginTop: 8 }}>
              <a href={r.documentUrl} target="_blank" rel="noreferrer" style={{ color: "var(--forest)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <FileText size={14} /> View Attached Document
              </a>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 }}>
            <div style={{ fontSize: 11.5, color: "var(--moss)" }}>{doctorName(r.doctorId)}</div>
            <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={() => {
              setPrintingRecord(r);
              setTimeout(() => window.print(), 100);
            }} title="Print Prescription"><Download size={14} /></button>
          </div>
        </div>
      ))}

      {modalOpen && <RecordModal patients={patients} doctors={doctors} onClose={() => setModalOpen(false)} onSave={saveRecord} isPending={isPending || isUploading} />}
      
      {printingRecord && (
        <PrescriptionPrintTemplate 
          record={printingRecord}
          patient={patients.find((p: any) => p.id === printingRecord.patientId)}
          doctor={doctors.find((d: any) => d.id === printingRecord.doctorId)}
          clinic={clinic}
        />
      )}
    </div>
  )
}

function PrescriptionPrintTemplate({ record, clinic, patient, doctor }: any) {
  let config: any = {};
  try {
    config = JSON.parse(clinic.billingConfig || "{}");
  } catch(e) {}
  
  return (
    <div id="print-root" style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", color: "#000", fontFamily: "sans-serif" }}>
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
      <div className="cw-modal" onClick={e => e.stopPropagation()}>
        <div className="cw-modal-head">
          <h3>New medical record</h3>
          <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={onClose} disabled={isPending}><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form, file); }}>
          <div className="cw-modal-body">
            <div className="cw-row2">
              <div className="cw-field"><label>Patient</label>
                <select className="cw-select" value={form.patientId} onChange={set("patientId")} disabled={isPending} required>
                  {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="cw-field"><label>Doctor</label>
                <select className="cw-select" value={form.doctorId} onChange={set("doctorId")} disabled={isPending} required>
                  {doctors.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="cw-field"><label>Date</label><input className="cw-input" type="date" value={form.date} onChange={set("date")} required disabled={isPending} /></div>
            <div className="cw-field"><label>Diagnosis</label><input className="cw-input" value={form.diagnosis} onChange={set("diagnosis")} required placeholder="e.g. Acute bronchitis" disabled={isPending} /></div>
            <div className="cw-field"><label>Prescription</label><input className="cw-input" value={form.prescription} onChange={set("prescription")} placeholder="e.g. Azithromycin 500mg, once daily, 3 days" disabled={isPending} /></div>
            <div className="cw-field"><label>Clinical notes</label><textarea className="cw-textarea" rows={4} value={form.notes} onChange={set("notes")} placeholder="Observations, vitals, follow-up plan…" disabled={isPending} /></div>
            <div className="cw-field">
              <label>Attach Document (Optional)</label>
              <input type="file" className="cw-input" onChange={e => setFile(e.target.files?.[0] || null)} disabled={isPending} accept="image/*,.pdf" />
              <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>Images will be automatically compressed before upload.</div>
            </div>
          </div>
          <div className="cw-modal-foot">
            <button type="button" className="cw-btn cw-btn-ghost cw-btn-sm" onClick={onClose} disabled={isPending}>Cancel</button>
            <button type="submit" className="cw-btn cw-btn-primary cw-btn-sm" disabled={isPending}>{isPending ? "Saving..." : "Save record"}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
