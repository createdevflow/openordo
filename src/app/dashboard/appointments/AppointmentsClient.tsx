"use client"

import React, { useState, useTransition } from "react"
import { Search, Plus, LayoutGrid, List as ListIcon, ChevronLeft, ChevronRight, X, Pencil, Trash2, Lock, Video } from "lucide-react"
import { initials, fmtDate, fmtDateShort, fmtTime12, toISO, pad, StatusBadge } from "@/components/DashboardHelpers"
import { createAppointmentAction, updateAppointmentAction, updateAppointmentStatusAction } from "@/server/actions/appointments"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import Link from "next/link"

export function AppointmentsClient({ 
  appointments, 
  patients, 
  doctors, 
  hasMultiDoctor = false, 
  planName = "Starter",
  hasVideoPlugin = false
}: any) {
  const [mode, setMode] = useState("calendar")
  const today = new Date()
  const isoToday = toISO(today.getFullYear(), today.getMonth(), today.getDate())
  
  const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(isoToday)
  const [statusFilter, setStatusFilter] = useState("all")
  const [doctorFilter, setDoctorFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [isPending, startTransition] = useTransition()
  const { confirm, showAlert } = useConfirm()

  const year = monthCursor.getFullYear(), month = monthCursor.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells = []
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ d: daysInPrevMonth - i, muted: true, iso: null })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, muted: false, iso: toISO(year, month, d) })
  while (cells.length % 7 !== 0) cells.push({ d: cells.length, muted: true, iso: null })

  // Map dates since they come from DB as Date objects
  const mappedAppointments = appointments.map((a: any) => ({
    ...a,
    dateString: toISO(new Date(a.date).getFullYear(), new Date(a.date).getMonth(), new Date(a.date).getDate())
  }))

  const dayAppointments = mappedAppointments
    .filter((a: any) => a.dateString === selectedDate && (doctorFilter === "all" || a.doctorId === doctorFilter))
    .sort((a: any, b: any) => a.time.localeCompare(b.time))

  const patientName = (id: string) => patients.find((p: any) => p.id === id)?.name || "Unknown"
  const doctorName = (id: string) => doctors.find((d: any) => d.id === id)?.name || "Unknown"

  const listFiltered = mappedAppointments
    .filter((a: any) => (statusFilter === "all" || a.status === statusFilter) && (doctorFilter === "all" || a.doctorId === doctorFilter))
    .filter((a: any) => {
      if (!searchTerm) return true
      const pName = patientName(a.patientId).toLowerCase()
      const dName = doctorName(a.doctorId).toLowerCase()
      const q = searchTerm.toLowerCase()
      return pName.includes(q) || dName.includes(q) || (a.reason || "").toLowerCase().includes(q)
    })
    .sort((a: any, b: any) => (b.dateString + b.time).localeCompare(a.dateString + a.time))

  const totalPages = Math.max(1, Math.ceil(listFiltered.length / itemsPerPage))
  const paginatedList = listFiltered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  function saveAppointment(data: any) {
    startTransition(async () => {
      try {
        if (editing) {
          await updateAppointmentAction(editing.id, data)
        } else {
          await createAppointmentAction(data)
        }
        setModalOpen(false)
        setEditing(null)
      } catch (err: any) {
        console.error(err)
        showAlert({ title: "Error", body: err.message || "Failed to save appointment", tone: "danger" })
      }
    })
  }

  function setStatus(id: string, status: string) {
    startTransition(async () => {
      try {
        await updateAppointmentStatusAction(id, status)
      } catch (err) {
        console.error(err)
        showAlert({ title: "Error", body: "Failed to update status", tone: "danger" })
      }
    })
  }


  return (
    <div>
      <div className="cw-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="cw-tabs">
            <button className={`cw-tab ${mode === "calendar" ? "active" : ""}`} onClick={() => setMode("calendar")}><LayoutGrid size={14} />Calendar</button>
            <button className={`cw-tab ${mode === "list" ? "active" : ""}`} onClick={() => setMode("list")}><ListIcon size={14} />List</button>
          </div>

          {hasMultiDoctor ? (
            <select 
              className="cw-select" 
              value={doctorFilter} 
              onChange={e => setDoctorFilter(e.target.value)}
              style={{ padding: "4px 10px", fontSize: 12.5, height: 32, borderRadius: 6, border: "1px solid var(--line)", background: "var(--paper-raised)" }}
            >
              <option value="all">All Doctors ({doctors.length})</option>
              {doctors.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          ) : doctors.length > 1 ? (
            <Link 
              href="/dashboard/settings?tab=subscription" 
              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--ink-soft)", textDecoration: "none", background: "var(--paper-raised)", padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)" }}
              title="Multi-doctor schedule management is available on Clinic Group"
            >
              <Lock size={12} /> Multi-doctor (Clinic Group)
            </Link>
          ) : null}
        </div>

        <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={() => { setEditing(null); setModalOpen(true); }} disabled={isPending}>
          <Plus size={15} />New appointment
        </button>
      </div>

      {mode === "calendar" ? (
        <div className="cw-grid-2">
          <div className="cw-panel">
            <div className="cw-panel-head">
              <h3>{monthCursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h3>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={() => setMonthCursor(new Date(year, month - 1, 1))}><ChevronLeft size={15} /></button>
                <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={() => setMonthCursor(new Date(year, month + 1, 1))}><ChevronRight size={15} /></button>
              </div>
            </div>
            <div className="cw-panel-body">
              <div className="cw-cal-grid">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div className="cw-cal-dow" key={d}>{d}</div>)}
                {cells.map((c, i) => {
                  const count = c.iso ? mappedAppointments.filter((a: any) => a.dateString === c.iso).length : 0;
                  return (
                    <div
                      key={i}
                      className={`cw-cal-cell ${c.muted ? "muted" : ""} ${c.iso === isoToday ? "today" : ""} ${c.iso === selectedDate ? "selected" : ""}`}
                      onClick={() => c.iso && setSelectedDate(c.iso)}
                    >
                      <div className="cw-cal-daynum">{c.d}</div>
                      {count > 0 && <span className="cw-cal-pip">{count} visit{count > 1 ? "s" : ""}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="cw-panel">
            <div className="cw-panel-head"><h3>{fmtDate(selectedDate)}</h3></div>
            <div className="cw-panel-body">
              {dayAppointments.length === 0 ? (
                <div className="cw-empty" style={{ padding: "20px 0" }}><p>Nothing scheduled this day.</p></div>
              ) : dayAppointments.map((a: any) => (
                <div className="cw-list-row" key={a.id} style={{ alignItems: "flex-start" }}>
                  <div className="mono" style={{ fontSize: 12, color: "var(--moss)", width: 64, flexShrink: 0, paddingTop: 2 }}>{fmtTime12(a.time)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{patientName(a.patientId)}</div>
                      {a.visitType === "VIDEO" && (
                        <span style={{ fontSize: 10.5, background: "rgba(124, 58, 237, 0.12)", color: "#7C3AED", fontWeight: 700, padding: "2px 6px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <Video size={11} /> Video Call
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{doctorName(a.doctorId)} · {a.reason}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <StatusBadge status={a.status} />
                      {a.visitType === "VIDEO" && a.status?.toLowerCase() === "scheduled" && (
                        <div style={{ display: "flex", gap: 4 }}>
                          <Link
                            href={"/consultation/" + (a.roomId || a.id)}
                            target="_blank"
                            className="cw-btn cw-btn-primary cw-btn-sm"
                            style={{ padding: "3px 9px", fontSize: 11.5, background: "#7C3AED", borderColor: "#7C3AED", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            <Video size={12} /> Join Call
                          </Link>
                          <button
                            className="cw-btn cw-btn-ghost cw-btn-sm"
                            style={{ padding: "3px 6px", fontSize: 11.5 }}
                            onClick={() => {
                              const url = `${window.location.origin}/consultation/${a.roomId || a.id}`;
                              navigator.clipboard.writeText(url);
                              showAlert({ title: "Copied", body: "Video link copied to clipboard!", tone: "primary" });
                            }}
                            title="Copy Invite Link"
                          >
                            📋 Copy Link
                          </button>
                        </div>
                      )}
                      {a.status.toLowerCase() === "scheduled" && <>
                        <button className="cw-btn cw-btn-ghost cw-btn-sm" style={{ padding: "3px 9px", fontSize: 11.5 }} onClick={() => setStatus(a.id, "completed")} disabled={isPending}>Mark completed</button>
                        <button className="cw-btn cw-btn-ghost cw-btn-sm" style={{ padding: "3px 9px", fontSize: 11.5 }} onClick={() => { 
                          setEditing({ ...a, date: a.dateString }); 
                          setModalOpen(true); 
                        }} disabled={isPending}>Edit</button>
                      </>}
                      {a.status.toLowerCase() === "completed" && (
                        <Link href={`/dashboard/billing?action=new&patientId=${a.patientId}`} className="cw-btn cw-btn-primary cw-btn-sm" style={{ padding: "3px 9px", fontSize: 11.5, textDecoration: "none" }}>Generate Invoice</Link>
                      )}
                      <Link href={`/dashboard/patients?search=${patientName(a.patientId)}`} className="cw-btn cw-btn-ghost cw-btn-sm" style={{ padding: "3px 9px", fontSize: 11.5, textDecoration: "none" }}>View Patient</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="cw-panel">
          <div className="cw-panel-head">
            <h3>All appointments</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search appointments..." 
                  value={searchTerm} 
                  onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1)}}
                  className="cw-input !pl-9 w-48 sm:w-64 !m-0 !py-1.5"
                />
              </div>
              <div className="cw-chip-filter">
                {["all", "scheduled", "completed", "cancelled", "noshow"].map(s => (
                  <button key={s} className={`cw-chip ${statusFilter === s ? "active" : ""}`} onClick={() => {setStatusFilter(s); setCurrentPage(1);}}>{s === "all" ? "All" : s === "noshow" ? "No-show" : s[0].toUpperCase() + s.slice(1)}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="cw-table-wrap">
            <table className="cw-table">
              <thead><tr><th>Patient</th><th>Doctor</th><th>Date & time</th><th>Reason</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {paginatedList.map((a: any) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {patientName(a.patientId)}
                        {a.visitType === "VIDEO" && (
                          <span style={{ fontSize: 10, background: "rgba(124, 58, 237, 0.12)", color: "#7C3AED", fontWeight: 700, padding: "1px 5px", borderRadius: 4 }}>
                            Video
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{doctorName(a.doctorId)}</td>
                    <td className="num">{fmtDateShort(a.dateString)}, {fmtTime12(a.time)}</td>
                    <td>{a.reason}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {a.visitType === "VIDEO" && a.status?.toLowerCase() === "scheduled" && (
                          <>
                            <Link
                              href={"/consultation/" + (a.roomId || a.id)}
                              target="_blank"
                              className="cw-btn cw-btn-primary cw-btn-sm"
                              style={{ padding: "3px 8px", fontSize: 11, background: "#7C3AED", borderColor: "#7C3AED", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}
                            >
                              <Video size={11} /> Join
                            </Link>
                            <button
                              className="cw-btn cw-btn-ghost cw-btn-icon"
                              style={{ padding: "3px 6px", fontSize: 11 }}
                              onClick={() => {
                                const url = `${window.location.origin}/consultation/${a.roomId || a.id}`;
                                navigator.clipboard.writeText(url);
                                showAlert({ title: "Copied", body: "Video link copied to clipboard!", tone: "primary" });
                              }}
                              title="Copy Invite Link"
                            >
                              📋
                            </button>
                          </>
                        )}
                        {a.status.toLowerCase() === "completed" && (
                          <Link href={`/dashboard/billing?action=new&patientId=${a.patientId}`} className="cw-btn cw-btn-primary cw-btn-sm" style={{ padding: "3px 8px", fontSize: 11, textDecoration: "none" }}>Invoice</Link>
                        )}
                        <Link href={`/dashboard/patients?search=${patientName(a.patientId)}`} className="cw-btn cw-btn-ghost cw-btn-sm" style={{ padding: "3px 8px", fontSize: 11, textDecoration: "none" }}>Patient</Link>
                        <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={() => { 
                          setEditing({ ...a, date: a.dateString }); 
                          setModalOpen(true); 
                        }} disabled={isPending}><Pencil size={13} /></button>
                        {a.status.toLowerCase() === "scheduled" && <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={() => setStatus(a.id, "cancelled")} disabled={isPending}><X size={13} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {listFiltered.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-4 text-[13.5px] text-ink-soft gap-4 p-4 border-t border-line">
                <div>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, listFiltered.length)} of {listFiltered.length} entries</div>
                <div className="flex items-center gap-2">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1.5 border border-line rounded bg-white hover:bg-paper-raised disabled:opacity-50 text-ink transition-colors font-medium">Previous</button>
                  <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1.5 border border-line rounded bg-white hover:bg-paper-raised disabled:opacity-50 text-ink transition-colors font-medium">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <AppointmentModal
          initial={editing}
          patients={patients}
          doctors={doctors}
          defaultDate={selectedDate}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={saveAppointment}
          isPending={isPending}
          hasVideoPlugin={hasVideoPlugin}
        />
      )}
    </div>
  )
}

function AppointmentModal({ initial, patients, doctors, defaultDate, onClose, onSave, isPending, hasVideoPlugin }: any) {
  const { showAlert } = useConfirm()
  const isEditing = Boolean(initial);
  const [patientMode, setPatientMode] = useState<"existing" | "new">(() => {
    if (initial) return "existing";
    return patients.length > 0 ? "existing" : "new";
  });

  const [form, setForm] = useState(initial || {
    patientId: patients[0]?.id || "",
    doctorId: doctors[0]?.id || "",
    date: defaultDate,
    time: "09:00",
    duration: 30,
    reason: "",
    status: "scheduled",
    visitType: initial?.visitType || "IN_PERSON",
    newPatient: {
      name: "",
      phone: "",
      age: 30,
      gender: "Female",
      email: ""
    }
  });

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEditing && patientMode === "new") {
      if (!form.newPatient.name.trim()) {
        showAlert({ title: "Missing Info", body: "Please enter the patient's name.", tone: "neutral" });
        return;
      }
      onSave({
        doctorId: form.doctorId,
        date: form.date,
        time: form.time,
        duration: Number(form.duration),
        reason: form.reason,
        status: form.status,
        visitType: form.visitType,
        newPatient: form.newPatient
      });
    } else {
      if (!form.patientId) {
        showAlert({ title: "Missing Info", body: "Please select a patient.", tone: "neutral" });
        return;
      }
      onSave({
        patientId: form.patientId,
        doctorId: form.doctorId,
        date: form.date,
        time: form.time,
        duration: Number(form.duration),
        reason: form.reason,
        status: form.status,
        visitType: form.visitType
      });
    }
  }

  return (
    <div className="cw-overlay" onClick={onClose}>
      <div className="cw-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="cw-modal-head">
          <h3>{initial ? "Edit appointment" : "New appointment"}</h3>
          <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={onClose} disabled={isPending}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="cw-modal-body">
            {!isEditing && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
                  Patient Selection
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className={`cw-chip ${patientMode === "existing" ? "active" : ""}`}
                    onClick={() => setPatientMode("existing")}
                    disabled={patients.length === 0 || isPending}
                  >
                    Select existing {patients.length > 0 ? `(${patients.length})` : "(0)"}
                  </button>
                  <button
                    type="button"
                    className={`cw-chip ${patientMode === "new" ? "active" : ""}`}
                    onClick={() => setPatientMode("new")}
                    disabled={isPending}
                  >
                    + New patient
                  </button>
                </div>
              </div>
            )}

            {!isEditing && patientMode === "new" ? (
              <div style={{ background: "var(--paper-raised)", border: "1px solid var(--line)", borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "var(--forest)" }}>
                  New Patient Details
                </div>
                <div className="cw-field">
                  <label>Full name *</label>
                  <input
                    className="cw-input"
                    value={form.newPatient?.name || ""}
                    onChange={e => setForm({ ...form, newPatient: { ...form.newPatient, name: e.target.value } })}
                    required
                    placeholder="e.g. Rahul Sharma"
                    disabled={isPending}
                  />
                </div>
                <div className="cw-row2">
                  <div className="cw-field">
                    <label>Phone *</label>
                    <input
                      className="cw-input"
                      value={form.newPatient?.phone || ""}
                      onChange={e => setForm({ ...form, newPatient: { ...form.newPatient, phone: e.target.value } })}
                      required
                      placeholder="+91 98765 43210"
                      disabled={isPending}
                    />
                  </div>
                  <div className="cw-field">
                    <label>Email (optional)</label>
                    <input
                      className="cw-input"
                      type="email"
                      value={form.newPatient?.email || ""}
                      onChange={e => setForm({ ...form, newPatient: { ...form.newPatient, email: e.target.value } })}
                      placeholder="patient@mail.com"
                      disabled={isPending}
                    />
                  </div>
                </div>
                <div className="cw-row2">
                  <div className="cw-field">
                    <label>Age</label>
                    <input
                      className="cw-input"
                      type="number"
                      value={form.newPatient?.age || 30}
                      onChange={e => setForm({ ...form, newPatient: { ...form.newPatient, age: Number(e.target.value) } })}
                      min={0}
                      max={120}
                      disabled={isPending}
                    />
                  </div>
                  <div className="cw-field">
                    <label>Gender</label>
                    <select
                      className="cw-select"
                      value={form.newPatient?.gender || "Female"}
                      onChange={e => setForm({ ...form, newPatient: { ...form.newPatient, gender: e.target.value } })}
                      disabled={isPending}
                    >
                      <option>Female</option>
                      <option>Male</option>
                      <option>Non-binary</option>
                      <option>Prefer not to say</option>
                    </select>
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>
                  ✓ This patient will automatically be saved into your clinic roster.
                </div>
              </div>
            ) : (
              <div className="cw-field">
                <label>Patient</label>
                <select className="cw-select" value={form.patientId} onChange={set("patientId")} required disabled={isPending}>
                  {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.displayId})</option>)}
                </select>
              </div>
            )}

            <div className="cw-field"><label>Doctor</label>
              <select className="cw-select" value={form.doctorId} onChange={set("doctorId")} required disabled={isPending}>
                {doctors.map((d: any) => <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>)}
              </select>
            </div>
            <div className="cw-row2">
              <div className="cw-field"><label>Date</label><input className="cw-input" type="date" value={form.date} onChange={set("date")} required disabled={isPending} /></div>
              <div className="cw-field"><label>Time</label><input className="cw-input" type="time" value={form.time} onChange={set("time")} required disabled={isPending} /></div>
            </div>
            <div className="cw-row2">
              <div className="cw-field"><label>Duration (minutes)</label>
                <select className="cw-select" value={form.duration} onChange={set("duration")} disabled={isPending}>
                  {[15, 20, 30, 45, 60].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div className="cw-field"><label>Status</label>
                <select className="cw-select" value={form.status.toLowerCase()} onChange={set("status")} disabled={isPending}>
                  <option value="scheduled">Scheduled</option><option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option><option value="noshow">No-show</option>
                </select>
              </div>
            </div>
            {hasVideoPlugin ? (
              <div className="cw-field">
                <label>Visit Type</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    type="button"
                    className={`cw-btn ${form.visitType !== "VIDEO" ? "cw-btn-primary" : "cw-btn-ghost"}`}
                    style={{ justifyContent: "center", fontSize: 12.5 }}
                    onClick={() => setForm({ ...form, visitType: "IN_PERSON" })}
                    disabled={isPending}
                  >
                    🏥 In-Person Visit
                  </button>
                  <button
                    type="button"
                    className={`cw-btn ${form.visitType === "VIDEO" ? "cw-btn-primary" : "cw-btn-ghost"}`}
                    style={{
                      justifyContent: "center",
                      fontSize: 12.5,
                      background: form.visitType === "VIDEO" ? "#7C3AED" : undefined,
                      borderColor: form.visitType === "VIDEO" ? "#7C3AED" : undefined,
                      color: form.visitType === "VIDEO" ? "#fff" : undefined
                    }}
                    onClick={() => setForm({ ...form, visitType: "VIDEO" })}
                    disabled={isPending}
                  >
                    <Video size={13} /> Video Consultation
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, padding: "8px 12px", background: "rgba(200,134,43,0.08)", border: "1px solid rgba(200,134,43,0.2)", borderRadius: 6, color: "var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span>📹 Want to conduct video consultations?</span>
                <Link href="/dashboard/addons" style={{ color: "var(--amber)", fontWeight: 700, textDecoration: "none" }}>Enable Add-on →</Link>
              </div>
            )}
            <div className="cw-field"><label>Reason for visit</label><input className="cw-input" value={form.reason} onChange={set("reason")} required placeholder="e.g. Annual checkup" disabled={isPending} /></div>
          </div>
          <div className="cw-modal-foot">
            <button type="button" className="cw-btn cw-btn-ghost cw-btn-sm" onClick={onClose} disabled={isPending}>Cancel</button>
            <button type="submit" className="cw-btn cw-btn-primary cw-btn-sm" disabled={isPending}>{initial ? "Save changes" : "Schedule appointment"}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
