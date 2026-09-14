"use client"

import React, { useState, useTransition } from "react"
import { Search, Plus, Users, Pencil, Trash2, X, Phone, Mail, MapPin, Droplet, Lock, ArrowUpRight } from "lucide-react"
import { initials, fmtDate, fmtDateShort, fmtTime12, currency, StatusBadge } from "@/components/DashboardHelpers"
import { createPatientAction, updatePatientAction, deletePatientAction } from "@/server/actions/patients"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import Link from "next/link"

export function PatientsClient({ 
  initialPatients, 
  appointments, 
  records, 
  invoices, 
  doctors,
  initialSearch = "",
  patientLimit = null,
  planName = "Starter",
  hasBilling = false
}: any) {
  const [search, setSearch] = useState(initialSearch)
  const [modalOpen, setModalOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { confirm, showAlert } = useConfirm()

  const isLimitReached = patientLimit !== null && initialPatients.length >= patientLimit
  
  const filtered = initialPatients.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.displayId.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  )

  const selected = initialPatients.find((p: any) => p.id === selectedPatientId)

  function handleAddClick() {
    if (isLimitReached) {
      setUpgradeModalOpen(true)
    } else {
      setEditing(null)
      setModalOpen(true)
    }
  }

  function savePatient(data: any) {
    startTransition(async () => {
      try {
        if (editing) {
          await updatePatientAction(editing.id, data)
        } else {
          await createPatientAction(data)
        }
        setModalOpen(false)
        setEditing(null)
      } catch (err: any) {
        console.error(err)
        showAlert({ title: "Error", body: err.message || "Failed to save patient", tone: "danger" })
      }
    })
  }

  function deletePatient(id: string) {
    startTransition(async () => {
      try {
        await deletePatientAction(id)
        if (selectedPatientId === id) setSelectedPatientId(null)
      } catch (err) {
        console.error(err)
        showAlert({ title: "Error", body: "Failed to delete patient", tone: "danger" })
      }
    })
  }

  return (
    <div>
      <div className="cw-toolbar">
        <div className="cw-toolbar-left" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="cw-search-box">
            <Search size={15} color="#8B8A7E" />
            <input placeholder="Search by name, ID or phone…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            {initialPatients.length}{patientLimit !== null ? ` / ${patientLimit}` : ""} patients
          </span>
          <span style={{ 
            fontSize: 11.5, 
            background: isLimitReached ? "var(--amber-soft)" : "var(--paper-raised)", 
            color: isLimitReached ? "var(--amber)" : "var(--ink-soft)",
            padding: "2px 8px", 
            borderRadius: 12, 
            fontWeight: 600,
            border: "1px solid var(--line)"
          }}>
            {planName} plan {isLimitReached ? "(Limit reached)" : ""}
          </span>
        </div>
        <button 
          className="cw-btn cw-btn-primary cw-btn-sm" 
          onClick={handleAddClick} 
          disabled={isPending}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          {isLimitReached ? <Lock size={14} /> : <Plus size={15} />}
          Add patient
        </button>
      </div>

      {isLimitReached && (
        <div style={{
          background: "var(--amber-soft)",
          border: "1px solid var(--amber)",
          borderRadius: 8,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5, color: "#6B4C15" }}>
              Patient quota reached ({initialPatients.length} of {patientLimit})
            </div>
            <div style={{ fontSize: 12.5, color: "#8E6924", marginTop: 2 }}>
              Your {planName} plan allows a maximum of {patientLimit} patient profiles. Upgrade to Practice or Clinic Group for unlimited patients.
            </div>
          </div>
          <Link href="/dashboard/settings?tab=subscription" className="cw-btn cw-btn-primary cw-btn-sm" style={{ textDecoration: "none", whiteSpace: "nowrap", color: "#ffffff" }}>
            Upgrade Plan <ArrowUpRight size={13} style={{ marginLeft: 4 }} />
          </Link>
        </div>
      )}

      <div className="cw-panel">
        {filtered.length === 0 ? (
          <div className="cw-empty">
            <div className="icon"><Users size={20} /></div>
            <h4>No patients found</h4>
            <p>Try a different search, or add a new patient to get started.</p>
            <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={handleAddClick} disabled={isPending}>
              {isLimitReached ? <Lock size={14} style={{ marginRight: 4 }} /> : <Plus size={15} />}
              Add patient
            </button>
          </div>
        ) : (
          <div className="cw-table-wrap">
            <table className="cw-table">
              <thead>
                <tr><th>Patient</th><th>Age / Gender</th><th>Contact</th><th>Condition</th><th>Joined</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => (
                  <tr key={p.id} className="clickable" onClick={() => setSelectedPatientId(p.id)}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="cw-avatar" style={{ background: p.colorTag, width: 32, height: 32, fontSize: 11.5 }}>{initials(p.name)}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div className="mono" style={{ fontSize: 11.5, color: "var(--moss)" }}>{p.displayId}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.age} yrs · {p.gender}</td>
                    <td>
                      <div>{p.phone}</div>
                      {p.email && <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{p.email}</div>}
                    </td>
                    <td>{p.condition || <span style={{ color: "var(--ink-soft)" }}>—</span>}</td>
                    <td className="num">{fmtDateShort(p.createdAt)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={() => { setEditing(p); setModalOpen(true); }} disabled={isPending}><Pencil size={13} /></button>
                        <button className="cw-btn cw-btn-danger cw-btn-icon" onClick={async (e) => { 
                          e.stopPropagation(); 
                          const ok = await confirm({ title: "Delete patient?", body: `Are you sure you want to delete ${p.name}? All their appointments and records will also be permanently deleted.`, tone: "danger" }); 
                          if (ok) deletePatient(p.id); 
                        }} disabled={isPending}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <PatientModal initial={editing} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={savePatient} isPending={isPending} />
      )}

      {selected && (
        <PatientDrawer
          patient={selected}
          appointments={appointments.filter((a: any) => a.patientId === selected.id)}
          records={records.filter((r: any) => r.patientId === selected.id)}
          invoices={invoices.filter((i: any) => i.patientId === selected.id)}
          doctors={doctors}
          hasBilling={hasBilling}
          onClose={() => setSelectedPatientId(null)}
          onEdit={() => { setEditing(selected); setModalOpen(true); }}
        />
      )}

      {upgradeModalOpen && (
        <div className="cw-overlay" onClick={() => setUpgradeModalOpen(false)}>
          <div className="cw-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="cw-modal-head">
              <h3>Patient Limit Reached</h3>
              <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={() => setUpgradeModalOpen(false)}><X size={16} /></button>
            </div>
            <div className="cw-modal-body" style={{ textAlign: "center", padding: "24px 16px" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--amber-soft)", color: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Lock size={22} />
              </div>
              <h4 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Upgrade your plan for unlimited patients</h4>
              <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.5, marginBottom: 20 }}>
                You have reached your limit of <strong>{patientLimit} patients</strong> on the <strong>{planName} plan</strong>. Upgrade to Practice or Clinic Group for unlimited patient management, online booking, and invoicing.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link href="/dashboard/settings?tab=subscription" className="cw-btn cw-btn-primary" style={{ justifyContent: "center", textDecoration: "none", color: "#ffffff" }}>
                  View Upgrade Options
                </Link>
                <button className="cw-btn cw-btn-ghost" onClick={() => setUpgradeModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PatientModal({ initial, onClose, onSave, isPending }: any) {
  const [form, setForm] = useState(initial || {
    name: "", age: 30, gender: "Female", phone: "", email: "", address: "", bloodGroup: "O+", allergies: "", condition: ""
  })
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="cw-overlay" onClick={onClose}>
      <div className="cw-modal" onClick={e => e.stopPropagation()}>
        <div className="cw-modal-head">
          <h3>{initial ? "Edit patient" : "Add new patient"}</h3>
          <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={onClose} disabled={isPending}><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave({ ...form, age: Number(form.age) }); }}>
          <div className="cw-modal-body">
            <div className="cw-field"><label>Full name</label><input className="cw-input" value={form.name} onChange={set("name")} required placeholder="e.g. Priya Sharma" disabled={isPending} /></div>
            <div className="cw-row2">
              <div className="cw-field"><label>Age</label><input className="cw-input" type="number" value={form.age} onChange={set("age")} required min={0} max={125} disabled={isPending} /></div>
              <div className="cw-field"><label>Gender</label>
                <select className="cw-select" value={form.gender} onChange={set("gender")} disabled={isPending}>
                  <option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option>
                </select>
              </div>
            </div>
            <div className="cw-row2">
              <div className="cw-field"><label>Phone</label><input className="cw-input" value={form.phone} onChange={set("phone")} required placeholder="+91 90000 00000" disabled={isPending} /></div>
              <div className="cw-field"><label>Email</label><input className="cw-input" type="email" value={form.email || ""} onChange={set("email")} placeholder="patient@mail.com" disabled={isPending} /></div>
            </div>
            <div className="cw-field"><label>Address</label><input className="cw-input" value={form.address || ""} onChange={set("address")} placeholder="Street, city" disabled={isPending} /></div>
            <div className="cw-row2">
              <div className="cw-field"><label>Blood group</label>
                <select className="cw-select" value={form.bloodGroup || "O+"} onChange={set("bloodGroup")} disabled={isPending}>
                  {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="cw-field"><label>Known allergies</label><input className="cw-input" value={form.allergies || ""} onChange={set("allergies")} placeholder="None known" disabled={isPending} /></div>
            </div>
            <div className="cw-field"><label>Current condition / reason on file</label><input className="cw-input" value={form.condition || ""} onChange={set("condition")} placeholder="e.g. Annual physical" disabled={isPending} /></div>
          </div>
          <div className="cw-modal-foot">
            <button type="button" className="cw-btn cw-btn-ghost cw-btn-sm" onClick={onClose} disabled={isPending}>Cancel</button>
            <button type="submit" className="cw-btn cw-btn-primary cw-btn-sm" disabled={isPending}>{initial ? "Save changes" : "Add patient"}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PatientDrawer({ patient, appointments, records, invoices, doctors, hasBilling, onClose, onEdit }: any) {
  const [tab, setTab] = useState("history")
  const docName = (id: string) => doctors.find((d: any) => d.id === id)?.name || "—"

  return (
    <div className="cw-drawer-overlay" onClick={onClose}>
      <div className="cw-drawer" onClick={e => e.stopPropagation()}>
        <div className="cw-drawer-head">
          <div style={{ display: "flex", gap: 14 }}>
            <div className="cw-avatar" style={{ background: patient.colorTag, width: 50, height: 50, fontSize: 16 }}>{initials(patient.name)}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{patient.name}</div>
              <div className="mono" style={{ fontSize: 12, color: "var(--moss)" }}>{patient.displayId}</div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>{patient.age} yrs · {patient.gender} · {patient.bloodGroup || "O+"}</div>
            </div>
          </div>
          <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="cw-drawer-body">
          <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
            <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={onEdit}><Pencil size={13} />Edit</button>
            <Link href={`/dashboard/appointments?action=new&patientId=${patient.id}`} className="cw-btn cw-btn-ghost cw-btn-sm" style={{ textDecoration: "none" }}><Plus size={13} /> New Appointment</Link>
            {hasBilling && (
              <Link href={`/dashboard/billing?action=new&patientId=${patient.id}`} className="cw-btn cw-btn-ghost cw-btn-sm" style={{ textDecoration: "none" }}><Plus size={13} /> New Invoice</Link>
            )}
            <Link href={`/dashboard/prescriptions?action=new&patientId=${patient.id}`} className="cw-btn cw-btn-ghost cw-btn-sm" style={{ textDecoration: "none" }}><Plus size={13} /> New Prescription</Link>
          </div>

          <div className="cw-panel" style={{ marginBottom: 18 }}>
            <div className="cw-panel-body">
              <div className="cw-list-row"><Phone size={14} color="var(--moss)" /><span>{patient.phone}</span></div>
              <div className="cw-list-row"><Mail size={14} color="var(--moss)" /><span>{patient.email || "No email on file"}</span></div>
              <div className="cw-list-row"><MapPin size={14} color="var(--moss)" /><span>{patient.address || "No address on file"}</span></div>
              <div className="cw-list-row"><Droplet size={14} color="var(--moss)" /><span>Allergies: {patient.allergies || "None known"}</span></div>
            </div>
          </div>

          <div className="cw-tabs" style={{ marginBottom: 16 }}>
            <button className={`cw-tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>Visit history</button>
            <button className={`cw-tab ${tab === "records" ? "active" : ""}`} onClick={() => setTab("records")}>Medical records</button>
            <button className={`cw-tab ${tab === "billing" ? "active" : ""}`} onClick={() => setTab("billing")}>
              Billing {!hasBilling && <Lock size={11} style={{ marginLeft: 4, display: "inline" }} />}
            </button>
          </div>

          {tab === "history" && (
            appointments.length === 0 ? <div className="cw-empty"><p>No appointments on file.</p></div> :
            appointments.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((a: any) => (
              <div className="cw-list-row" key={a.id}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.reason}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{docName(a.doctorId)} · {fmtDate(a.date)}, {fmtTime12(a.time)}</div>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))
          )}

          {tab === "records" && (
            records.length === 0 ? <div className="cw-empty"><p>No medical records yet.</p></div> :
            records.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((r: any) => (
              <div className="cw-record-card" key={r.id}>
                <div className="rhead">
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{r.diagnosis}</span>
                  <span className="rdate">{fmtDateShort(r.date)}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 4 }}><b>Prescription:</b> {r.prescription || "None"}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{r.notes || ""}</div>
                <div style={{ fontSize: 11.5, color: "var(--moss)", marginTop: 8 }}>{docName(r.doctorId)}</div>
              </div>
            ))
          )}

          {tab === "billing" && (
            !hasBilling ? (
              <div className="cw-empty" style={{ padding: "30px 16px" }}>
                <Lock size={20} color="var(--ink-soft)" style={{ margin: "0 auto 8px" }} />
                <div style={{ fontWeight: 600, fontSize: 14 }}>Invoicing & Billing Locked</div>
                <p style={{ fontSize: 12.5, color: "var(--ink-soft)", maxWidth: 280, margin: "6px auto 16px" }}>
                  Patient invoicing and billing are available on the Practice and Clinic Group plans.
                </p>
                <Link href="/dashboard/settings?tab=subscription" className="cw-btn cw-btn-primary cw-btn-sm" style={{ textDecoration: "none", color: "#ffffff" }}>
                  Upgrade Plan
                </Link>
              </div>
            ) : invoices.length === 0 ? (
              <div className="cw-empty"><p>No invoices for this patient.</p></div>
            ) : (
              invoices.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((inv: any) => {
                const items = typeof inv.items === "string" ? JSON.parse(inv.items) : inv.items || [];
                const total = items.reduce((s: number, it: any) => s + Number(it.amount || 0), 0);
                return (
                  <div className="cw-list-row" key={inv.id}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }} className="mono">{inv.displayId}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{fmtDate(inv.date)} · {items.map((it: any) => it.desc).join(", ")}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="mono" style={{ fontWeight: 700, fontSize: 13.5 }}>{currency(total)}</div>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  )
}
