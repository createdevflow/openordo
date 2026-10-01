import React from "react"
import { adminGetDataRequestsAction, adminProcessDataRequestAction } from "@/server/actions/data-export"
import { FileDown, CheckCircle2, Clock } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminDataRequestsPage() {
  const requests = await adminGetDataRequestsAction()

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Data Export Requests</h1>
        <p className="text-sm text-ink-soft mt-1">Manage patient requests for data exports across all clinics.</p>
      </div>

      <div className="bg-white border border-line rounded-xl shadow-sm overflow-hidden">
        {requests.length === 0 ? (
          <div className="text-center py-16 text-ink-soft">
            <FileDown size={44} className="mx-auto mb-3 opacity-40" />
            <p>No data export requests found.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {requests.map(req => (
              <div key={req.id} className="p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-ink">{req.patientAccount.name}</span>
                    <span className="text-xs text-ink-soft">({req.patientAccount.email})</span>
                  </div>
                  <div className="text-sm text-ink-soft">Clinic: {req.clinic.name}</div>
                  <div className="text-xs text-ink-soft mt-1">
                    Requested: {req.createdAt.toLocaleString()}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {req.status === "PENDING" ? (
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded">
                        <Clock size={12} /> Pending
                      </span>
                      <form action={async () => {
                        "use server"
                        await adminProcessDataRequestAction(req.id)
                      }}>
                        <button className="px-4 py-2 bg-forest text-white text-sm font-semibold rounded hover:bg-forest-dark transition-colors">
                          Generate & Send
                        </button>
                      </form>
                    </div>
                  ) : req.status === "COMPLETED" ? (
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded">
                        <CheckCircle2 size={12} /> Completed
                      </span>
                      <a href={req.downloadUrl || "#"} target="_blank" rel="noreferrer" className="px-4 py-2 bg-paper text-ink text-sm font-semibold rounded border border-line hover:bg-line transition-colors">
                        View ZIP
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">{req.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
