"use client"

import React, { useState, useTransition } from "react"
import { Plus, Phone, Mail, CalendarClock, Pencil, Trash2, X, Lock, ArrowUpRight } from "lucide-react"
import { initials } from "@/components/DashboardHelpers"
import { createDoctorAction, updateDoctorAction, deleteDoctorAction } from "@/server/actions/doctors"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import Link from "next/link"

export function DoctorsClient({ doctors, appointments, doctorLimit = null, planName = "Starter" }: any) {
  const [modalOpen, setModalOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [isPending, startTransition] = useTransition()
  const { confirm, showAlert } = useConfirm()
  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const isLimitReached = doctorLimit !== null && doctors.length >= doctorLimit

  const mappedDoctors = doctors.map((d: any) => {
    let parsedDays = []
    if (typeof d.workingDays === "string") {
      try {
        parsedDays = JSON.parse(d.workingDays)
      } catch (e) {
        parsedDays = d.workingDays.split(",").map((s: string) => s.trim().substring(0, 3))
      }
    } else {
      parsedDays = d.workingDays || []
    }
    return { ...d, days: parsedDays }
  })

  function handleAddClick() {
    if (isLimitReached) {
      setUpgradeModalOpen(true)
    } else {
      setEditing(null)
      setModalOpen(true)
    }
  }

  function save(data: any) {
    startTransition(async () => {
      try {
        if (editing) {
          await updateDoctorAction(editing.id, {
            name: data.name,
            specialty: data.specialty,
            phone: data.phone,
            email: data.email,
            workingDays: data.days
          })
        } else {
          await createDoctorAction({
            name: data.name,
            specialty: data.specialty,
            phone: data.phone,
            email: data.email,
            workingDays: data.days
          })
        }
        setModalOpen(false)
        setEditing(null)
      } catch (err: any) {
        console.error(err)
        showAlert({ title: "Error", body: err.message || "Failed to save doctor", tone: "danger" })
      }
    })
  }

  async function remove(id: string) {
    const ok = await confirm({ title: "Remove Doctor?", body: "Are you sure you want to remove this doctor?", tone: "danger" })
    if (!ok) return
    startTransition(async () => {
      try {
        await deleteDoctorAction(id)
      } catch (err) {
        console.error(err)
        showAlert({ title: "Error", body: "Failed to remove doctor", tone: "danger" })
      }
    })
  }

  return (
    <div>
      <div className="cw-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            {doctors.length}{doctorLimit !== null ? ` / ${doctorLimit}` : ""} staff members
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
          Add doctor / staff
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
              Doctor quota reached ({doctors.length} of {doctorLimit})
            </div>
            <div style={{ fontSize: 12.5, color: "#8E6924", marginTop: 2 }}>
              Your {planName} plan allows a maximum of {doctorLimit} doctor{doctorLimit > 1 ? "s" : ""}. Upgrade to add more doctors.
            </div>
          </div>
          <Link href="/dashboard/settings?tab=subscription" className="cw-btn cw-btn-primary cw-btn-sm" style={{ textDecoration: "none", whiteSpace: "nowrap", color: "#ffffff" }}>
            Upgrade Plan <ArrowUpRight size={13} style={{ marginLeft: 4 }} />
          </Link>
        </div>
      )}

      <div className="cw-doctor-grid">
        {mappedDoctors.map((d: any) => {
          const load = appointments.filter((a: any) => a.doctorId === d.id && a.status.toLowerCase() === "scheduled").length;
          return (
            <div className="cw-doctor-card" key={d.id}>
              <div className="head">
                <div className="cw-avatar" style={{ width: 42, height: 42 }}>{initials(d.name)}</div>
                <div>
                  <div className="name">{d.name}</div>
                  <div className="spec">{d.specialty}</div>
                </div>
              </div>
              <div className="row"><Phone size={13} />{d.phone}</div>
              <div className="row"><Mail size={13} />{d.email}</div>
              <div className="row"><CalendarClock size={13} />{load} upcoming appointment{load !== 1 ? "s" : ""}</div>
              <div className="days">
                {allDays.map(day => <span key={day} className={`cw-daychip ${d.days.includes(day) ? "on" : ""}`}>{day}</span>)}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
                <button className="cw-btn cw-btn-ghost cw-btn-sm" style={{ flex: 1 }} onClick={() => { setEditing(d); setModalOpen(true); }} disabled={isPending}><Pencil size={13} />Edit</button>
                <button className="cw-btn cw-btn-danger cw-btn-icon" onClick={() => remove(d.id)} disabled={isPending}><Trash2 size={13} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <DoctorModal initial={editing} allDays={allDays} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={save} isPending={isPending} />
      )}

      {upgradeModalOpen && (
        <div className="cw-overlay" onClick={() => setUpgradeModalOpen(false)}>
          <div className="cw-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="cw-modal-head">
              <h3>Doctor Limit Reached</h3>
              <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={() => setUpgradeModalOpen(false)}><X size={16} /></button>
            </div>
            <div className="cw-modal-body" style={{ textAlign: "center", padding: "24px 16px" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--amber-soft)", color: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Lock size={22} />
              </div>
              <h4 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Upgrade your plan to add more doctors</h4>
              <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.5, marginBottom: 20 }}>
                You are currently on the <strong>{planName} plan</strong>, which allows up to <strong>{doctorLimit} doctor</strong>. To add multiple doctors, multi-doctor scheduling, and unlimited staff, upgrade your subscription.
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

function DoctorModal({ initial, allDays, onClose, onSave, isPending }: any) {
  const [form, setForm] = useState(initial || { name: "", specialty: "", phone: "", email: "", days: [] });
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  function toggleDay(day: string) {
    setForm((f: any) => ({ ...f, days: f.days.includes(day) ? f.days.filter((d: string) => d !== day) : [...f.days, day] }));
  }
  return (
    <div className="cw-overlay" onClick={onClose}>
      <div className="cw-modal" onClick={e => e.stopPropagation()}>
        <div className="cw-modal-head">
          <h3>{initial ? "Edit staff member" : "Add doctor / staff"}</h3>
          <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={onClose} disabled={isPending}><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
          <div className="cw-modal-body">
            <div className="cw-field"><label>Full name</label><input className="cw-input" value={form.name} onChange={set("name")} required placeholder="Dr. Jamie Cole" disabled={isPending} /></div>
            <div className="cw-field"><label>Specialty / role</label><input className="cw-input" value={form.specialty} onChange={set("specialty")} required placeholder="e.g. Dental Surgeon, Front Desk" disabled={isPending} /></div>
            <div className="cw-row2">
              <div className="cw-field"><label>Phone</label><input className="cw-input" value={form.phone} onChange={set("phone")} required disabled={isPending} /></div>
              <div className="cw-field"><label>Email</label><input className="cw-input" type="email" value={form.email} onChange={set("email")} required disabled={isPending} /></div>
            </div>
            <div className="cw-field">
              <label>Working days</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {allDays.map((day: string) => (
                  <button type="button" key={day} className={`cw-chip ${form.days.includes(day) ? "active" : ""}`} onClick={() => toggleDay(day)} disabled={isPending}>{day}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="cw-modal-foot">
            <button type="button" className="cw-btn cw-btn-ghost cw-btn-sm" onClick={onClose} disabled={isPending}>Cancel</button>
            <button type="submit" className="cw-btn cw-btn-primary cw-btn-sm" disabled={isPending}>{initial ? "Save changes" : "Add staff member"}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
