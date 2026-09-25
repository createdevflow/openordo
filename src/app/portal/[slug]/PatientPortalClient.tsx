"use client"

import React, { useState } from "react"
import { Calendar, FileText, Pill, Receipt, FolderOpen, Video, FileDown, LogOut, Clock } from "lucide-react"

export function PatientPortalClient({ patient, clinic, accentColor }: { patient: any, clinic: any, accentColor: string }) {
  const [activeTab, setActiveTab] = useState<"APPOINTMENTS" | "RECORDS" | "PRESCRIPTIONS" | "INVOICES" | "DOCUMENTS">("APPOINTMENTS")

  const upcomingAppointments = patient.appointments.filter((a: any) => new Date(a.date) >= new Date() && a.status !== "CANCELLED")
  const pastAppointments = patient.appointments.filter((a: any) => new Date(a.date) < new Date() || a.status === "CANCELLED")

  function handleLogout() {
    // We can clear cookie using a server action or API route.
    // Easiest is to just delete the cookie via JS document.cookie if it wasn't httpOnly.
    // Since it's httpOnly, we need an endpoint. We will just redirect to a logout route.
    window.location.href = `/portal/${clinic.slug}/logout`
  }

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
        activeTab === id 
          ? "border-forest text-forest" 
          : "border-transparent text-ink-soft hover:text-ink hover:border-line"
      }`}
      style={activeTab === id ? { borderColor: accentColor, color: accentColor } : {}}
    >
      <Icon size={16} />
      {label}
    </button>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Welcome, {patient.name.split(" ")[0]}</h1>
          <p className="text-ink-soft mt-1">Here is your medical information from {clinic.name}.</p>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-paper-raised hover:bg-line border border-line rounded-lg text-sm font-medium text-ink transition-colors self-start sm:self-auto"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-line overflow-x-auto no-scrollbar">
        <div className="flex">
          <TabButton id="APPOINTMENTS" label="Appointments" icon={Calendar} />
          <TabButton id="RECORDS" label="Medical Records" icon={FileText} />
          <TabButton id="PRESCRIPTIONS" label="Prescriptions" icon={Pill} />
          <TabButton id="INVOICES" label="Invoices" icon={Receipt} />
          <TabButton id="DOCUMENTS" label="Documents" icon={FolderOpen} />
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl border border-line p-6 shadow-sm min-h-[400px]">
        {activeTab === "APPOINTMENTS" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-ink mb-4">Upcoming Appointments</h2>
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-8 bg-paper rounded-lg border border-line border-dashed text-ink-soft">
                  You have no upcoming appointments.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {upcomingAppointments.map((app: any) => (
                    <div key={app.id} className="border border-line rounded-lg p-4 flex flex-col justify-between hover:border-forest/50 transition-colors">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${app.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {app.status}
                          </span>
                          {app.visitType === "VIDEO" && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              <Video size={12} /> Video
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-lg text-ink mb-1">
                          {new Date(app.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-ink-soft font-medium flex items-center gap-2 mb-3">
                          <Clock size={14} /> {app.time} ({app.duration} min)
                        </div>
                        <div className="text-sm text-ink mb-1 font-medium">Dr. {app.doctor.name}</div>
                        <div className="text-sm text-ink-soft mb-4">{app.reason}</div>
                      </div>
                      
                      {app.visitType === "VIDEO" && app.roomId && app.status !== "CANCELLED" && (
                        <a 
                          href={`/consultation/${app.roomId}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center justify-center w-full py-2 bg-forest text-white rounded font-semibold text-sm hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: accentColor }}
                        >
                          Join Video Call
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {pastAppointments.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-ink mb-4">Past Appointments</h2>
                <div className="space-y-3">
                  {pastAppointments.map((app: any) => (
                    <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-line rounded-lg bg-paper-raised">
                      <div>
                        <div className="font-semibold text-ink">
                          {new Date(app.date).toLocaleDateString()} at {app.time}
                        </div>
                        <div className="text-sm text-ink-soft">
                          Dr. {app.doctor.name} • {app.reason}
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-0 text-sm font-medium text-ink-soft uppercase">
                        {app.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "RECORDS" && (
          <div>
            <h2 className="text-lg font-bold text-ink mb-4">Medical Records</h2>
            {patient.records.length === 0 ? (
              <div className="text-center py-12 text-ink-soft border border-line border-dashed rounded-lg">
                No medical records found.
              </div>
            ) : (
              <div className="space-y-4">
                {patient.records.map((rec: any) => (
                  <div key={rec.id} className="border border-line rounded-lg p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-4 border-b border-line">
                      <div>
                        <div className="font-bold text-ink">{new Date(rec.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                        <div className="text-sm text-ink-soft mt-1">Dr. {rec.doctor.name}</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Diagnosis</h4>
                        <p className="text-ink">{rec.diagnosis}</p>
                      </div>
                      {rec.notes && (
                        <div>
                          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Clinical Notes</h4>
                          <p className="text-ink whitespace-pre-wrap">{rec.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "PRESCRIPTIONS" && (
          <div>
            <h2 className="text-lg font-bold text-ink mb-4">Prescriptions</h2>
            {patient.prescriptions.length === 0 ? (
              <div className="text-center py-12 text-ink-soft border border-line border-dashed rounded-lg">
                No prescriptions found.
              </div>
            ) : (
              <div className="space-y-4">
                {patient.prescriptions.map((rx: any) => {
                  let items = []
                  try { items = JSON.parse(rx.items) } catch(e){}
                  return (
                    <div key={rx.id} className="border border-line rounded-lg p-5 bg-paper-raised/50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                        <div>
                          <div className="font-bold text-ink">{new Date(rx.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                          <div className="text-sm text-ink-soft mt-1">Prescribed by Dr. {rx.doctor.name}</div>
                        </div>
                      </div>
                      <div className="bg-white border border-line rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-paper border-b border-line text-ink-soft text-xs uppercase font-semibold">
                            <tr>
                              <th className="px-4 py-2">Medication</th>
                              <th className="px-4 py-2">Dosage</th>
                              <th className="px-4 py-2">Frequency</th>
                              <th className="px-4 py-2">Duration</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line text-ink">
                            {items.map((item: any, i: number) => (
                              <tr key={i}>
                                <td className="px-4 py-3 font-medium">{item.drug}</td>
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
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "INVOICES" && (
          <div>
            <h2 className="text-lg font-bold text-ink mb-4">Invoices</h2>
            {patient.invoices.length === 0 ? (
              <div className="text-center py-12 text-ink-soft border border-line border-dashed rounded-lg">
                No invoices found.
              </div>
            ) : (
              <div className="space-y-3">
                {patient.invoices.map((inv: any) => {
                  let items = []
                  try { items = JSON.parse(inv.items) } catch(e){}
                  const total = items.reduce((acc: number, item: any) => acc + (Number(item.price) || 0) * (Number(item.qty) || 1), 0)
                  
                  return (
                    <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-line rounded-lg hover:bg-paper transition-colors">
                      <div>
                        <div className="font-semibold text-ink flex items-center gap-2">
                          {inv.displayId}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' : inv.status === 'CANCELLED' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'}`}>
                            {inv.status}
                          </span>
                        </div>
                        <div className="text-sm text-ink-soft mt-1">
                          {new Date(inv.date).toLocaleDateString()} • {items.length} items
                        </div>
                      </div>
                      <div className="mt-3 sm:mt-0 text-lg font-bold text-ink">
                        {total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "DOCUMENTS" && (
          <div>
            <h2 className="text-lg font-bold text-ink mb-4">Patient Documents</h2>
            {patient.PatientDocument.length === 0 ? (
              <div className="text-center py-12 text-ink-soft border border-line border-dashed rounded-lg">
                No documents uploaded.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {patient.PatientDocument.map((doc: any) => (
                  <a 
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-4 border border-line rounded-lg hover:border-forest/50 hover:bg-forest-soft/10 transition-all group"
                  >
                    <div className="w-10 h-10 bg-paper border border-line rounded-lg flex items-center justify-center text-ink-soft group-hover:text-forest transition-colors">
                      <FileDown size={20} />
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-medium text-ink truncate" title={doc.name}>{doc.name}</div>
                      <div className="text-xs text-ink-soft mt-0.5 uppercase flex items-center gap-2">
                        <span>{doc.type.replace("_", " ")}</span>
                        <span>•</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
