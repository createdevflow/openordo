import React, { useState } from "react"
import { Calendar, FileText, Pill, Receipt, FolderOpen, Video, FileDown, LogOut, Clock, Menu, X, User } from "lucide-react"

export function PatientPortalClient({ patient, clinic, accentColor, logoUrl }: { patient: any, clinic: any, accentColor: string, logoUrl?: string | null }) {
  const [activeTab, setActiveTab] = useState<"APPOINTMENTS" | "RECORDS" | "PRESCRIPTIONS" | "INVOICES" | "DOCUMENTS" | "PROFILE">("APPOINTMENTS")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const upcomingAppointments = patient.appointments.filter((a: any) => new Date(a.date) >= new Date() && a.status !== "CANCELLED")
  const pastAppointments = patient.appointments.filter((a: any) => new Date(a.date) < new Date() || a.status === "CANCELLED")

  function handleLogout() {
    window.location.href = `/portal/${clinic.slug}/logout`
  }

  const SidebarItem = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => { setActiveTab(id); setMobileMenuOpen(false) }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
        activeTab === id 
          ? "bg-forest/10 text-forest" 
          : "text-ink-soft hover:bg-line hover:text-ink"
      }`}
      style={activeTab === id ? { color: accentColor, backgroundColor: `${accentColor}1A` } : {}}
    >
      <Icon size={18} />
      {label}
    </button>
  )

  return (
    <div className="flex h-screen bg-paper overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-ink/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-line transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-16 flex items-center px-6 border-b border-line justify-between lg:justify-start">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={clinic.name} className="h-8" />
            ) : (
              <div className="w-8 h-8 rounded flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: accentColor }}>
                {clinic.name.charAt(0)}
              </div>
            )}
            <span className="font-bold text-ink truncate pr-4">{clinic.name}</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden text-ink-soft hover:text-ink">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-1">
          <div className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2 px-4 mt-2">Menu</div>
          <SidebarItem id="APPOINTMENTS" label="Appointments" icon={Calendar} />
          <SidebarItem id="RECORDS" label="Medical Records" icon={FileText} />
          <SidebarItem id="PRESCRIPTIONS" label="Prescriptions" icon={Pill} />
          <SidebarItem id="DOCUMENTS" label="Documents" icon={FolderOpen} />
          <SidebarItem id="INVOICES" label="Billing & Invoices" icon={Receipt} />
          
          <div className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2 px-4 mt-6">Settings</div>
          <SidebarItem id="PROFILE" label="My Profile" icon={User} />
        </div>

        <div className="p-4 border-t border-line">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-coral hover:bg-coral-soft transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-line flex items-center justify-between px-4 sm:px-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 -ml-2 text-ink-soft hover:text-ink rounded-lg hover:bg-paper">
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-ink hidden sm:block">
              {activeTab === "APPOINTMENTS" && "Appointments"}
              {activeTab === "RECORDS" && "Medical Records"}
              {activeTab === "PRESCRIPTIONS" && "Prescriptions"}
              {activeTab === "INVOICES" && "Billing & Invoices"}
              {activeTab === "DOCUMENTS" && "Documents"}
              {activeTab === "PROFILE" && "My Profile"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-right hidden sm:block">
              <div className="font-semibold text-ink">{patient.name}</div>
              <div className="text-xs text-ink-soft">Patient ID: {patient.displayId}</div>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm" style={{ backgroundColor: patient.colorTag || accentColor }}>
              {patient.name.charAt(0)}
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {activeTab === "APPOINTMENTS" && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-bold text-ink mb-4">Upcoming Appointments</h2>
                  {upcomingAppointments.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-line border-dashed text-ink-soft">
                      <Calendar size={48} className="mx-auto text-ink-soft/50 mb-3" />
                      <p>You have no upcoming appointments.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {upcomingAppointments.map((app: any) => (
                        <div key={app.id} className="bg-white border border-line rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${app.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {app.status}
                              </span>
                              {app.visitType === "VIDEO" && (
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                                  <Video size={14} /> Video
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-xl text-ink mb-1">
                              {new Date(app.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                            </div>
                            <div className="text-ink-soft font-medium flex items-center gap-2 mb-4 text-sm">
                              <Clock size={16} /> {app.time} ({app.duration} min)
                            </div>
                            <div className="text-sm font-medium text-ink bg-paper inline-block px-3 py-1.5 rounded-lg mb-2">
                              Dr. {app.doctor.name}
                            </div>
                            <div className="text-sm text-ink-soft mb-4">{app.reason}</div>
                          </div>
                          
                          {app.visitType === "VIDEO" && app.roomId && app.status !== "CANCELLED" && (
                            <a 
                              href={`/consultation/${app.roomId}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center justify-center w-full py-2.5 text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm mt-2"
                              style={{ backgroundColor: accentColor }}
                            >
                              Join Video Call
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {pastAppointments.length > 0 && (
                  <section>
                    <h2 className="text-xl font-bold text-ink mb-4">Past Appointments</h2>
                    <div className="bg-white rounded-xl border border-line overflow-hidden">
                      <div className="divide-y divide-line">
                        {pastAppointments.map((app: any) => (
                          <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-paper transition-colors">
                            <div className="flex gap-4 items-center">
                              <div className="hidden sm:flex flex-col items-center justify-center w-14 h-14 bg-paper rounded-lg border border-line text-ink">
                                <span className="text-xs font-bold uppercase">{new Date(app.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                                <span className="text-lg font-black leading-none">{new Date(app.date).getDate()}</span>
                              </div>
                              <div>
                                <div className="font-semibold text-ink text-[15px]">
                                  <span className="sm:hidden">{new Date(app.date).toLocaleDateString()} • </span>
                                  {app.time}
                                </div>
                                <div className="text-sm text-ink-soft">
                                  Dr. {app.doctor.name} • {app.reason}
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 sm:mt-0">
                              <span className="text-xs font-bold text-ink-soft bg-paper px-2.5 py-1 rounded-md uppercase tracking-wider">
                                {app.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}
              </div>
            )}

            {activeTab === "RECORDS" && (
              <div className="space-y-4">
                {patient.records.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-line border-dashed text-ink-soft">
                    <FileText size={48} className="mx-auto text-ink-soft/50 mb-3" />
                    No medical records available.
                  </div>
                ) : (
                  patient.records.map((rec: any) => (
                    <div key={rec.id} className="bg-white border border-line rounded-xl p-6 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 pb-5 border-b border-line">
                        <div>
                          <div className="font-bold text-lg text-ink flex items-center gap-2">
                            <FileText size={20} className="text-forest" style={{ color: accentColor }} />
                            {new Date(rec.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                          </div>
                          <div className="text-sm text-ink-soft mt-1">Consulting Physician: Dr. {rec.doctor.name}</div>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">Diagnosis</h4>
                          <p className="text-ink font-medium">{rec.diagnosis}</p>
                        </div>
                        {rec.notes && (
                          <div>
                            <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">Clinical Notes</h4>
                            <div className="text-ink bg-paper p-4 rounded-lg text-[15px] leading-relaxed whitespace-pre-wrap border border-line/50">
                              {rec.notes}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "PRESCRIPTIONS" && (
              <div className="space-y-4">
                {patient.prescriptions.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-line border-dashed text-ink-soft">
                    <Pill size={48} className="mx-auto text-ink-soft/50 mb-3" />
                    No active prescriptions.
                  </div>
                ) : (
                  patient.prescriptions.map((rx: any) => {
                    let items = []
                    try { items = JSON.parse(rx.items) } catch(e){}
                    return (
                      <div key={rx.id} className="bg-white border border-line rounded-xl overflow-hidden shadow-sm">
                        <div className="p-5 bg-paper/50 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="font-bold text-ink flex items-center gap-2">
                              <Pill size={18} className="text-forest" style={{ color: accentColor }} />
                              {new Date(rx.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                            </div>
                            <div className="text-sm text-ink-soft mt-1">Prescribed by Dr. {rx.doctor.name}</div>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-white border-b border-line text-ink-soft text-xs uppercase font-semibold">
                              <tr>
                                <th className="px-5 py-3 whitespace-nowrap">Medication</th>
                                <th className="px-5 py-3 whitespace-nowrap">Dosage</th>
                                <th className="px-5 py-3 whitespace-nowrap">Frequency</th>
                                <th className="px-5 py-3 whitespace-nowrap">Duration</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line text-ink">
                              {items.map((item: any, i: number) => (
                                <tr key={i} className="hover:bg-paper/50 transition-colors">
                                  <td className="px-5 py-4 font-semibold text-[15px]">{item.drug}</td>
                                  <td className="px-5 py-4">{item.dosage}</td>
                                  <td className="px-5 py-4">{item.frequency}</td>
                                  <td className="px-5 py-4">{item.durationDays} days</td>
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

            {activeTab === "INVOICES" && (
              <div className="space-y-4">
                {patient.invoices.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-line border-dashed text-ink-soft">
                    <Receipt size={48} className="mx-auto text-ink-soft/50 mb-3" />
                    No invoices generated yet.
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-line overflow-hidden shadow-sm">
                    <div className="divide-y divide-line">
                      {patient.invoices.map((inv: any) => {
                        let items = []
                        try { items = JSON.parse(inv.items) } catch(e){}
                        const total = items.reduce((acc: number, item: any) => acc + (Number(item.price) || 0) * (Number(item.qty) || 1), 0)
                        
                        return (
                          <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-paper transition-colors">
                            <div>
                              <div className="font-bold text-ink flex items-center gap-3 text-[15px]">
                                {inv.displayId}
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' : inv.status === 'CANCELLED' ? 'bg-gray-100 text-gray-600' : 'bg-coral-soft text-coral'}`}>
                                  {inv.status}
                                </span>
                              </div>
                              <div className="text-sm text-ink-soft mt-1.5 flex items-center gap-2">
                                <span>{new Date(inv.date).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>{items.length} item{items.length > 1 ? 's' : ''}</span>
                              </div>
                            </div>
                            <div className="mt-3 sm:mt-0 flex items-center gap-4">
                              <span className="text-lg font-black text-ink">
                                {total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "DOCUMENTS" && (
              <div>
                {patient.PatientDocument.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-line border-dashed text-ink-soft">
                    <FolderOpen size={48} className="mx-auto text-ink-soft/50 mb-3" />
                    No documents uploaded.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {patient.PatientDocument.map((doc: any) => (
                      <a 
                        key={doc.id}
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-white flex items-start gap-4 p-5 border border-line rounded-xl hover:border-forest/50 hover:shadow-md transition-all group"
                      >
                        <div className="w-12 h-12 shrink-0 bg-paper border border-line rounded-lg flex items-center justify-center text-ink-soft group-hover:text-white transition-colors" style={{ '--tw-group-hover-bg': accentColor } as any}>
                          <FileDown size={24} className="group-hover:text-forest transition-colors" style={{ color: "inherit" }} />
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-semibold text-ink text-[15px] truncate mb-1" title={doc.name}>{doc.name}</div>
                          <div className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">
                            {doc.type.replace("_", " ")}
                          </div>
                          <div className="text-xs text-ink-soft mt-0.5">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "PROFILE" && (
              <div className="bg-white border border-line rounded-xl shadow-sm overflow-hidden max-w-2xl">
                <div className="p-6 border-b border-line bg-paper/30 flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-white text-3xl shadow-md" style={{ backgroundColor: patient.colorTag || accentColor }}>
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-ink">{patient.name}</h2>
                    <p className="text-ink-soft font-medium mt-1">Patient ID: {patient.displayId}</p>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-sm font-bold text-ink-soft uppercase tracking-wider mb-4">Personal Details</h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs text-ink-soft mb-1 font-semibold uppercase">Email Address</div>
                      <div className="text-[15px] font-medium text-ink">{patient.email || "Not provided"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-ink-soft mb-1 font-semibold uppercase">Phone Number</div>
                      <div className="text-[15px] font-medium text-ink">{patient.phone}</div>
                    </div>
                    <div>
                      <div className="text-xs text-ink-soft mb-1 font-semibold uppercase">Age / Gender</div>
                      <div className="text-[15px] font-medium text-ink">{patient.age} years • {patient.gender}</div>
                    </div>
                    <div>
                      <div className="text-xs text-ink-soft mb-1 font-semibold uppercase">Blood Group</div>
                      <div className="text-[15px] font-medium text-ink">{patient.bloodGroup || "Unknown"}</div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-xs text-ink-soft mb-1 font-semibold uppercase">Address</div>
                      <div className="text-[15px] font-medium text-ink">{patient.address || "Not provided"}</div>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-ink-soft uppercase tracking-wider mb-4 mt-8 pt-6 border-t border-line">Medical History</h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs text-ink-soft mb-1 font-semibold uppercase">Known Allergies</div>
                      <div className="text-[15px] font-medium text-ink">{patient.allergies || "None reported"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-ink-soft mb-1 font-semibold uppercase">Chronic Conditions</div>
                      <div className="text-[15px] font-medium text-ink">{patient.condition || "None reported"}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  )
}
