"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar, FileText, Pill, Receipt, FolderOpen, Video, FileDown,
  LogOut, Clock, Menu, X, User, Bell, ChevronDown, Check, AlertCircle
} from "lucide-react"
import { markPatientNotificationReadAction } from "@/server/actions/patient-portal"

type LinkedClinic = {
  id: string
  name: string
  slug: string
  accentColor: string
  logoUrl: string | null
}

type PatientAccount = {
  id: string
  name: string
  email: string
  phone: string | null
}

interface Props {
  patient: any
  clinic: any
  account: PatientAccount | null
  accentColor: string
  logoUrl?: string | null
  linkedClinics: LinkedClinic[]
  shareRecords: boolean
}

export function PatientPortalClient({
  patient,
  clinic,
  account,
  accentColor,
  logoUrl,
  linkedClinics,
  shareRecords
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<
    "HOME" | "APPOINTMENTS" | "RECORDS" | "PRESCRIPTIONS" | "BILLING" | "DOCUMENTS" | "PROFILE" | "NOTIFICATIONS"
  >("HOME")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [clinicDropdownOpen, setClinicDropdownOpen] = useState(false)

  const upcomingAppointments = patient.appointments.filter(
    (a: any) => new Date(a.date) >= new Date() && a.status !== "CANCELLED" && a.status !== "cancelled"
  )
  const pastAppointments = patient.appointments.filter(
    (a: any) => new Date(a.date) < new Date() || a.status === "CANCELLED" || a.status === "cancelled"
  )

  function handleLogout() {
    window.location.href = `/portal/${clinic.slug}/logout`
  }

  function switchClinic(slug: string) {
    router.push(`/portal/${slug}`)
  }

  async function handleMarkRead(id: string) {
    await markPatientNotificationReadAction(id)
  }

  const SidebarItem = ({ id, label, icon: Icon }: { id: any; label: string; icon: any }) => (
    <button
      onClick={() => { setActiveTab(id); setMobileMenuOpen(false) }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
        activeTab === id ? "text-white" : "text-ink-soft hover:bg-line hover:text-ink"
      }`}
      style={activeTab === id ? { backgroundColor: accentColor } : {}}
    >
      <Icon size={17} />
      {label}
    </button>
  )

  const tabTitle: Record<string, string> = {
    HOME: "Dashboard",
    APPOINTMENTS: "Appointments",
    RECORDS: "Medical Records",
    PRESCRIPTIONS: "Prescriptions",
    BILLING: "Billing & Invoices",
    DOCUMENTS: "Documents",
    PROFILE: "My Profile",
    NOTIFICATIONS: "Notifications"
  }

  return (
    <div className="flex h-screen bg-paper overflow-hidden">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-ink/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-line flex flex-col transform transition-transform duration-200 lg:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-line gap-3 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt={clinic.name} className="h-8 flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded flex items-center justify-center font-bold text-white text-sm flex-shrink-0" style={{ backgroundColor: accentColor }}>
                {clinic.name.charAt(0)}
              </div>
            )}
            <span className="font-bold text-ink text-sm truncate">{clinic.name}</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden text-ink-soft hover:text-ink flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Clinic switcher (shown when linked to multiple) */}
        {linkedClinics.length > 1 && (
          <div className="px-4 py-3 border-b border-line relative">
            <button
              onClick={() => setClinicDropdownOpen(v => !v)}
              className="w-full flex items-center justify-between text-xs text-ink-soft hover:text-ink transition-colors font-semibold uppercase tracking-wider"
            >
              <span>Viewing: {clinic.name}</span>
              <ChevronDown size={14} className={`transition-transform ${clinicDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {clinicDropdownOpen && (
              <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-line rounded-lg shadow-lg z-50 overflow-hidden">
                {linkedClinics.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { switchClinic(c.slug); setClinicDropdownOpen(false) }}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-paper transition-colors"
                  >
                    <span className={`font-medium ${c.id === clinic.id ? "text-ink" : "text-ink-soft"}`}>{c.name}</span>
                    {c.id === clinic.id && <Check size={14} style={{ color: accentColor }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          <div className="text-[10px] font-semibold text-ink-soft uppercase tracking-wider px-4 mb-2">Main Menu</div>
          <SidebarItem id="HOME" label="Dashboard" icon={Calendar} />
          <SidebarItem id="APPOINTMENTS" label="Appointments" icon={Clock} />
          <SidebarItem id="RECORDS" label="Medical Records" icon={FileText} />
          <SidebarItem id="PRESCRIPTIONS" label="Prescriptions" icon={Pill} />
          <SidebarItem id="BILLING" label="Billing & Invoices" icon={Receipt} />
          <SidebarItem id="DOCUMENTS" label="Documents" icon={FolderOpen} />
          <div className="text-[10px] font-semibold text-ink-soft uppercase tracking-wider px-4 mb-2 mt-5">Account</div>
          <SidebarItem id="NOTIFICATIONS" label="Notifications" icon={Bell} />
          <SidebarItem id="PROFILE" label="My Profile" icon={User} />
        </nav>

        <div className="p-4 border-t border-line">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-coral hover:bg-coral-soft transition-colors"
          >
            <LogOut size={17} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-line flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-paper text-ink-soft hover:text-ink">
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-ink hidden sm:block">{tabTitle[activeTab]}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-ink">{account?.name || patient.name}</div>
              <div className="text-xs text-ink-soft">Patient ID: {patient.displayId}</div>
            </div>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
              style={{ backgroundColor: patient.colorTag || accentColor }}
            >
              {patient.name.charAt(0)}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* HOME DASHBOARD */}
            {activeTab === "HOME" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-ink">Welcome back, {patient.name.split(" ")[0]}</h2>
                  <p className="text-ink-soft mt-1 text-sm">Here's a summary of your health at {clinic.name}.</p>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Upcoming", value: upcomingAppointments.length, icon: Calendar, tab: "APPOINTMENTS" },
                    { label: "Records", value: patient.records.length, icon: FileText, tab: "RECORDS" },
                    { label: "Prescriptions", value: patient.prescriptions.length, icon: Pill, tab: "PRESCRIPTIONS" },
                    { label: "Invoices", value: patient.invoices.length, icon: Receipt, tab: "BILLING" }
                  ].map(s => (
                    <button
                      key={s.tab}
                      onClick={() => setActiveTab(s.tab as any)}
                      className="bg-white border border-line rounded-xl p-5 text-left hover:shadow-md transition-shadow"
                    >
                      <s.icon size={22} className="mb-3" style={{ color: accentColor }} />
                      <div className="text-2xl font-black text-ink">{s.value}</div>
                      <div className="text-sm text-ink-soft font-medium">{s.label}</div>
                    </button>
                  ))}
                </div>

                {/* Next appointment */}
                {upcomingAppointments[0] && (
                  <div className="bg-white border border-line rounded-xl p-5 shadow-sm">
                    <div className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-3">Next Appointment</div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-bold text-lg text-ink">
                          {new Date(upcomingAppointments[0].date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                        </div>
                        <div className="text-ink-soft text-sm mt-1 flex items-center gap-2">
                          <Clock size={14} /> {upcomingAppointments[0].time} ({upcomingAppointments[0].duration} min)
                        </div>
                        <div className="text-sm mt-2 font-medium text-ink">Dr. {upcomingAppointments[0].doctor.name}</div>
                        <div className="text-sm text-ink-soft">{upcomingAppointments[0].reason}</div>
                      </div>
                      {upcomingAppointments[0].visitType === "VIDEO" && upcomingAppointments[0].roomId && (
                        <a
                          href={`/consultation/${upcomingAppointments[0].roomId}`}
                          target="_blank" rel="noreferrer"
                          className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 flex-shrink-0"
                          style={{ backgroundColor: accentColor }}
                        >
                          Join Call
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* APPOINTMENTS */}
            {activeTab === "APPOINTMENTS" && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-bold text-ink mb-4">Upcoming Appointments</h2>
                  {upcomingAppointments.length === 0 ? (
                    <EmptyState icon={Calendar} message="No upcoming appointments." />
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {upcomingAppointments.map((app: any) => (
                        <AppointmentCard key={app.id} app={app} accentColor={accentColor} />
                      ))}
                    </div>
                  )}
                </section>
                {pastAppointments.length > 0 && (
                  <section>
                    <h2 className="text-xl font-bold text-ink mb-4">Past Appointments</h2>
                    <div className="bg-white rounded-xl border border-line overflow-hidden">
                      {pastAppointments.map((app: any) => (
                        <div key={app.id} className="flex items-center justify-between p-4 border-b border-line last:border-0 hover:bg-paper">
                          <div className="flex gap-4 items-center">
                            <div className="hidden sm:flex flex-col items-center w-12 h-12 bg-paper rounded-lg border border-line text-ink justify-center">
                              <span className="text-[10px] font-bold uppercase">{new Date(app.date).toLocaleDateString(undefined, { month: "short" })}</span>
                              <span className="text-lg font-black leading-tight">{new Date(app.date).getDate()}</span>
                            </div>
                            <div>
                              <div className="font-semibold text-ink text-sm">{app.time}</div>
                              <div className="text-xs text-ink-soft">Dr. {app.doctor.name} · {app.reason}</div>
                            </div>
                          </div>
                          <span className={`text-[11px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${app.status === "CANCELLED" || app.status === "cancelled" ? "bg-coral-soft text-coral" : "bg-paper text-ink-soft"}`}>
                            {app.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* RECORDS */}
            {activeTab === "RECORDS" && (
              <div className="space-y-4">
                {!shareRecords ? (
                  <div className="bg-white border border-line rounded-xl p-8 text-center">
                    <AlertCircle size={40} className="mx-auto mb-3 text-ink-soft/50" />
                    <p className="font-semibold text-ink">Records not shared by this clinic</p>
                    <p className="text-sm text-ink-soft mt-1">Contact {clinic.name} directly to request your medical records.</p>
                  </div>
                ) : patient.records.length === 0 ? (
                  <EmptyState icon={FileText} message="No medical records available." />
                ) : (
                  patient.records.map((rec: any) => (
                    <div key={rec.id} className="bg-white border border-line rounded-xl p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-line">
                        <FileText size={18} style={{ color: accentColor }} />
                        <div>
                          <div className="font-bold text-ink">{new Date(rec.date).toLocaleDateString(undefined, { dateStyle: "long" })}</div>
                          <div className="text-xs text-ink-soft">Dr. {rec.doctor.name}</div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Diagnosis</div>
                          <p className="text-ink font-medium">{rec.diagnosis}</p>
                        </div>
                        {rec.notes && (
                          <div>
                            <div className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Clinical Notes</div>
                            <p className="text-ink whitespace-pre-wrap bg-paper p-3 rounded-lg text-sm border border-line/50">{rec.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* PRESCRIPTIONS */}
            {activeTab === "PRESCRIPTIONS" && (
              <div className="space-y-4">
                {patient.prescriptions.length === 0 ? (
                  <EmptyState icon={Pill} message="No prescriptions issued yet." />
                ) : (
                  patient.prescriptions.map((rx: any) => {
                    let items: any[] = []
                    try { items = JSON.parse(rx.items) } catch { }
                    return (
                      <div key={rx.id} className="bg-white border border-line rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-paper/40 border-b border-line flex items-center gap-2">
                          <Pill size={18} style={{ color: accentColor }} />
                          <div>
                            <div className="font-bold text-ink text-sm">{new Date(rx.date).toLocaleDateString(undefined, { dateStyle: "long" })}</div>
                            <div className="text-xs text-ink-soft">Dr. {rx.doctor.name}</div>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-white border-b border-line text-xs font-semibold text-ink-soft uppercase">
                              <tr>
                                <th className="px-4 py-2 text-left whitespace-nowrap">Medication</th>
                                <th className="px-4 py-2 text-left whitespace-nowrap">Dosage</th>
                                <th className="px-4 py-2 text-left whitespace-nowrap">Frequency</th>
                                <th className="px-4 py-2 text-left whitespace-nowrap">Duration</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                              {items.map((item: any, i: number) => (
                                <tr key={i} className="hover:bg-paper/50">
                                  <td className="px-4 py-3 font-semibold">{item.drug}</td>
                                  <td className="px-4 py-3">{item.dosage}</td>
                                  <td className="px-4 py-3">{item.frequency}</td>
                                  <td className="px-4 py-3">{item.durationDays} days</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* BILLING */}
            {activeTab === "BILLING" && (
              <div className="space-y-4">
                {patient.invoices.length === 0 ? (
                  <EmptyState icon={Receipt} message="No invoices yet." />
                ) : (
                  <div className="bg-white rounded-xl border border-line overflow-hidden shadow-sm">
                    {patient.invoices.map((inv: any) => {
                      let items: any[] = []
                      try { items = JSON.parse(inv.items) } catch { }
                      const total = items.reduce((acc: number, item: any) => acc + (Number(item.price || item.amount) || 0) * (Number(item.qty) || 1), 0)
                      return (
                        <div key={inv.id} className="flex items-center justify-between p-5 border-b border-line last:border-0 hover:bg-paper">
                          <div>
                            <div className="font-bold text-ink flex items-center gap-2">
                              {inv.displayId}
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${inv.status === "paid" || inv.status === "PAID" ? "bg-green-100 text-green-700" : inv.status === "CANCELLED" ? "bg-gray-100 text-gray-600" : "bg-coral-soft text-coral"}`}>
                                {inv.status}
                              </span>
                            </div>
                            <div className="text-xs text-ink-soft mt-1">{new Date(inv.date).toLocaleDateString()} · {items.length} item{items.length !== 1 ? "s" : ""}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-black text-lg text-ink">{total.toLocaleString("en-US", { style: "currency", currency: "USD" })}</div>
                            {(inv.status === "unpaid" || inv.status === "UNPAID") && (
                              <div className="text-xs text-ink-soft mt-1">Contact {clinic.name} to pay</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* DOCUMENTS */}
            {activeTab === "DOCUMENTS" && (
              <div>
                {patient.PatientDocument.length === 0 ? (
                  <EmptyState icon={FolderOpen} message="No documents uploaded yet." />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {patient.PatientDocument.map((doc: any) => (
                      <a
                        key={doc.id}
                        href={doc.url}
                        target="_blank" rel="noreferrer"
                        className="bg-white flex items-start gap-4 p-5 border border-line rounded-xl hover:shadow-md transition-all group"
                      >
                        <div className="w-11 h-11 bg-paper border border-line rounded-lg flex items-center justify-center text-ink-soft">
                          <FileDown size={22} />
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-semibold text-ink text-sm truncate" title={doc.name}>{doc.name}</div>
                          <div className="text-[11px] font-bold text-ink-soft uppercase tracking-wider mt-0.5">{doc.type.replace("_", " ")}</div>
                          <div className="text-xs text-ink-soft mt-0.5">{new Date(doc.createdAt).toLocaleDateString()}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PROFILE */}
            {activeTab === "PROFILE" && (
              <div className="bg-white border border-line rounded-xl shadow-sm overflow-hidden max-w-2xl">
                <div className="p-6 border-b border-line bg-paper/30 flex items-center gap-5">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-white text-2xl" style={{ backgroundColor: patient.colorTag || accentColor }}>
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-ink">{patient.name}</h2>
                    <p className="text-sm text-ink-soft">Patient ID: {patient.displayId}</p>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <ProfileSection title="Contact Information">
                    <ProfileField label="Email" value={account?.email || patient.email || "—"} />
                    <ProfileField label="Phone" value={account?.phone || patient.phone || "—"} />
                    <ProfileField label="Address" value={patient.address || "Not provided"} />
                  </ProfileSection>
                  <div className="border-t border-line pt-6">
                    <ProfileSection title="Medical Information (Read-only)">
                      <ProfileField label="Age / Gender" value={`${patient.age} years · ${patient.gender}`} />
                      <ProfileField label="Blood Group" value={patient.bloodGroup || "Unknown"} />
                      <ProfileField label="Known Allergies" value={patient.allergies || "None reported"} />
                      <ProfileField label="Chronic Conditions" value={patient.condition || "None reported"} />
                    </ProfileSection>
                    <p className="text-xs text-ink-soft mt-4">
                      Clinical fields are maintained by {clinic.name}. Contact the clinic to update this information.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {activeTab === "NOTIFICATIONS" && (
              <div>
                <p className="text-sm text-ink-soft mb-4">Showing recent notifications from {clinic.name}.</p>
                {/* Notifications are fetched separately via server action — rendered as a client sub-component */}
                <NotificationsPanel clinicSlug={clinic.slug} accentColor={accentColor} />
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}

function AppointmentCard({ app, accentColor }: { app: any; accentColor: string }) {
  return (
    <div className="bg-white border border-line rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${app.status === "CONFIRMED" || app.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
            {app.status}
          </span>
          {app.visitType === "VIDEO" && (
            <span className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
              <Video size={12} /> Video
            </span>
          )}
        </div>
        <div className="font-bold text-xl text-ink mb-1">
          {new Date(app.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <div className="text-ink-soft text-sm flex items-center gap-2 mb-3">
          <Clock size={14} /> {app.time} ({app.duration} min)
        </div>
        <div className="text-sm font-medium bg-paper inline-block px-3 py-1.5 rounded-lg mb-2 text-ink">
          Dr. {app.doctor.name}
        </div>
        <div className="text-sm text-ink-soft">{app.reason}</div>
      </div>
      {app.visitType === "VIDEO" && app.roomId && app.status !== "CANCELLED" && (
        <a
          href={`/consultation/${app.roomId}`}
          target="_blank" rel="noreferrer"
          className="mt-4 flex items-center justify-center py-2.5 rounded-lg text-white font-semibold text-sm hover:opacity-90"
          style={{ backgroundColor: accentColor }}
        >
          Join Video Call
        </a>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-dashed border-line text-ink-soft">
      <Icon size={44} className="mx-auto mb-3 opacity-40" />
      <p>{message}</p>
    </div>
  )
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-4">{title}</h3>
      <div className="grid sm:grid-cols-2 gap-5">{children}</div>
    </div>
  )
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-ink-soft font-semibold uppercase mb-0.5">{label}</div>
      <div className="text-[15px] font-medium text-ink">{value}</div>
    </div>
  )
}

function NotificationsPanel({ clinicSlug, accentColor }: { clinicSlug: string; accentColor: string }) {
  const [notifications, setNotifications] = React.useState<any[] | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    import("@/server/actions/patient-portal").then(mod => {
      mod.getPatientNotificationsAction(clinicSlug).then(res => {
        if ("success" in res && res.success) setNotifications((res as any).notifications)
        setLoading(false)
      })
    })
  }, [clinicSlug])

  if (loading) return <div className="text-ink-soft text-sm">Loading notifications...</div>
  if (!notifications || notifications.length === 0) {
    return <EmptyState icon={Bell} message="No notifications yet." />
  }

  return (
    <div className="bg-white rounded-xl border border-line overflow-hidden shadow-sm">
      {notifications.map((n: any) => (
        <div key={n.id} className={`flex items-start gap-4 p-4 border-b border-line last:border-0 ${n.readAt ? "opacity-60" : ""}`}>
          <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: n.readAt ? "#ccc" : accentColor }} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ink text-sm">{n.title}</div>
            <div className="text-sm text-ink-soft">{n.body}</div>
            <div className="text-xs text-ink-soft mt-1">{new Date(n.createdAt).toLocaleString()}</div>
          </div>
          {!n.readAt && (
            <button
              onClick={() => markPatientNotificationReadAction(n.id).then(() => setNotifications(prev => prev ? prev.map(x => x.id === n.id ? { ...x, readAt: new Date() } : x) : prev))}
              className="text-xs text-ink-soft hover:text-ink flex-shrink-0"
            >
              Mark read
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
