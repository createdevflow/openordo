import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import { db } from "@/lib/db"
import { requireClinicId, requireUser } from "@/lib/auth-utils"

export default async function ViewPrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const clinicId = await requireClinicId()
  const user = await requireUser()
  const { id } = await params

  const rx = await db.prescription.findUnique({
    where: { id, clinicId },
    include: {
      patient: true,
      doctor: true,
      clinic: true
    }
  })

  if (!rx) {
    return notFound()
  }

  const items = JSON.parse(rx.items)

  return (
    <div className="p-7 max-w-[800px] mx-auto">
      <div className="flex justify-between items-center mb-6 no-print">
        <Link href="/dashboard/prescriptions" className="cw-btn cw-btn-ghost cw-btn-sm text-ink-soft hover:text-ink">
          <ArrowLeft size={16} className="mr-1.5" /> Back to Prescriptions
        </Link>
        <button
          className="cw-btn cw-btn-primary cw-btn-sm"
          style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
        >
          <Printer size={13} /> Print
        </button>
      </div>

      <div
        className="print-container"
        style={{
          border: "2px solid #1E4638",
          borderRadius: 8,
          padding: "30px 40px",
          background: "#fff",
          color: "#16241F"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #1E4638", paddingBottom: 16, marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#1E4638" }}>
              {rx.clinic?.name || "OpenORDO Medical Centre"}
            </h2>
            <div style={{ fontSize: 13, color: "#555", lineHeight: 1.4 }}>
              {rx.clinic?.address || "Health Plaza, Level 2"}<br />
              Phone: {rx.clinic?.phone || "+91 98765 43210"} • Email: {user.email}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1E4638" }}>
              Dr. {rx.doctor?.name || "Attending Physician"}
            </div>
            <div style={{ fontSize: 13, color: "#666" }}>
              {rx.doctor?.specialty || "General Medicine"}
            </div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
              Rx Date: {new Date(rx.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* Patient Info Strip */}
        <div style={{ background: "#F4F6F5", padding: "12px 16px", borderRadius: 6, display: "flex", justifyContent: "space-between", marginBottom: 24, fontSize: 14 }}>
          <div><b>Patient:</b> {rx.patient?.name}</div>
          <div><b>Age/Sex:</b> {rx.patient?.age || "—"} / {rx.patient?.gender || "—"}</div>
          <div><b>Patient ID:</b> {rx.patient?.displayId || "—"}</div>
        </div>

        {/* Rx Symbol */}
        <div style={{ fontSize: 32, fontWeight: 900, color: "#1E4638", fontFamily: "serif", marginBottom: 16 }}>
          ℞
        </div>

        {/* Medicines Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 32, fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #1E4638", textAlign: "left" }}>
              <th style={{ padding: "8px 4px", width: "30px" }}>#</th>
              <th style={{ padding: "8px" }}>Medicine / Drug</th>
              <th style={{ padding: "8px" }}>Dosage</th>
              <th style={{ padding: "8px" }}>Frequency</th>
              <th style={{ padding: "8px" }}>Duration</th>
              <th style={{ padding: "8px" }}>Instructions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, i: number) => (
              <tr key={i} style={{ borderBottom: "1px solid #E5E7EB" }}>
                <td style={{ padding: "10px 4px", fontWeight: 600 }}>{i + 1}</td>
                <td style={{ padding: "10px 8px", fontWeight: 700, color: "#16241F" }}>{it.drug}</td>
                <td style={{ padding: "10px 8px" }}>{it.dosage}</td>
                <td style={{ padding: "10px 8px" }}>{it.frequency}</td>
                <td style={{ padding: "10px 8px" }}>{it.durationDays} Days</td>
                <td style={{ padding: "10px 8px", color: "#555" }}>{it.notes || "As directed"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signature / Footer */}
        <div style={{ marginTop: 60, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 12, color: "#777" }}>
            Computer-generated clinical prescription issued via OpenORDO E-Prescriptions.
          </div>
          <div style={{ textAlign: "center", minWidth: 180 }}>
            <div style={{ borderBottom: "1px solid #16241F", height: 40 }}></div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>Dr. {rx.doctor?.name}</div>
            <div style={{ fontSize: 11, color: "#666" }}>Authorized Medical Signatory</div>
          </div>
        </div>
      </div>
      
      {/* Client-side print script */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.querySelector('button').addEventListener('click', function() {
          window.print();
        });
      `}} />
    </div>
  )
}
