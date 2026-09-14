import React from "react"
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

export function initials(name: string) {
  if (!name) return ""
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

export function pad(n: number | string) { 
  return String(n).padStart(2, "0") 
}

export function toISO(y: number, m: number, d: number) { 
  return `${y}-${pad(m + 1)}-${pad(d)}` 
}

export function fmtDate(iso: string | Date) {
  if (!iso) return ""
  const dateObj = typeof iso === "string" ? new Date(iso + (iso.includes("T") ? "" : "T00:00:00")) : iso
  return dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export function fmtDateShort(iso: string | Date) {
  if (!iso) return ""
  const dateObj = typeof iso === "string" ? new Date(iso + (iso.includes("T") ? "" : "T00:00:00")) : iso
  return dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export function fmtTime12(t: string) {
  if (!t) return ""
  const [h, m] = t.split(":").map(Number)
  const suffix = h >= 12 ? "PM" : "AM"
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${pad(m)} ${suffix}`
}

export function currency(n: number) {
  return "₹" + n.toLocaleString("en-IN")
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const map: Record<string, { cls: string, icon: any, label: string }> = {
    scheduled: { cls: "cw-badge-scheduled", icon: Clock, label: "Scheduled" },
    completed: { cls: "cw-badge-completed", icon: CheckCircle2, label: "Completed" },
    cancelled: { cls: "cw-badge-cancelled", icon: XCircle, label: "Cancelled" },
    noshow: { cls: "cw-badge-noshow", icon: AlertCircle, label: "No-show" },
    paid: { cls: "cw-badge-paid", icon: CheckCircle2, label: "Paid" },
    unpaid: { cls: "cw-badge-unpaid", icon: AlertCircle, label: "Unpaid" },
  }
  const m = map[normalized] || map.scheduled
  const Icon = m.icon
  return <span className={`cw-badge ${m.cls}`}><Icon size={11.5} />{m.label}</span>
}
