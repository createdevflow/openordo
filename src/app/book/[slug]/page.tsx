import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { BookingForm } from "./BookingForm"
import "../../dashboard.css"

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const clinic = await db.clinic.findUnique({
    where: { slug },
    include: { doctors: { orderBy: { name: "asc" } } }
  })

  if (!clinic || clinic.status !== "ACTIVE") return notFound()

  let config: any = {}
  try { config = JSON.parse(clinic.billingConfig || "{}") } catch (e) {}

  return (
    <div className="cw h-screen overflow-hidden flex flex-col" style={{ background: "var(--paper)", position: "relative" }}>
      
      {/* Top Left Logo Area */}
      <div style={{ position: "absolute", top: 24, left: 28, display: "flex", alignItems: "center", gap: 12 }}>
        {config.invoiceLogo ? (
          <img src={config.invoiceLogo} alt="Logo" style={{ height: 40, borderRadius: 6, objectFit: "contain" }} />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: "var(--forest)", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0
          }}>
            {clinic.name[0]}
          </div>
        )}
        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>{clinic.name}</div>
      </div>

      {/* Main Centered Content */}
      <div className="flex-1 w-full flex flex-col items-center justify-center" style={{ padding: "0 20px" }}>
        <div style={{ width: "100%", maxWidth: 600 }}>
          
          <div style={{ marginBottom: 16, textAlign: "center" }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)", margin: "0 0 8px" }}>
              Book an Appointment
            </h1>
            <p style={{ fontSize: 14.5, color: "var(--ink-soft)", margin: 0 }}>
              Fill in your details and we'll confirm your appointment shortly.
            </p>
          </div>

          <BookingForm clinicId={clinic.id} doctors={clinic.doctors} clinicPhone={clinic.phone} />

          <div style={{ marginTop: 16, textAlign: "center" }}>
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0 }}>
              Powered by <strong style={{ color: "var(--forest)", fontWeight: 700 }}>OpenORDO</strong>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
