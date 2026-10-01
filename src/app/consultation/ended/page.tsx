import { db } from "@/lib/db"

export default async function ConsultationEnded({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>
}) {
  const { room } = await searchParams
  let waNumber: string | null = null
  
  if (room) {
    const appt = await db.appointment.findFirst({
      where: { roomId: room },
      select: { clinic: { select: { whatsappNumber: true, phone: true } } }
    })
    if (appt?.clinic) {
      waNumber = appt.clinic.whatsappNumber || appt.clinic.phone || null
    }
  }

  const waLink = waNumber ? `https://wa.me/${waNumber.replace(/\D/g, '')}` : null

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#123025",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
      color: "#fff",
      padding: "24px",
      textAlign: "center",
    }}>
      {/* Logo mark */}
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: "#1E4638",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: 28, marginBottom: 28,
      }}>
        C
      </div>

      <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 10px" }}>
        Consultation ended
      </h1>
      <p style={{ fontSize: 15, color: "#B9C8C0", margin: "0 0 36px", maxWidth: 360 }}>
        Your session has been completed. Thank you for using OpenORDO.
      </p>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 280 }}>
        <a
          href="/"
          style={{
            display: "block", background: "#C8862B", color: "#123025",
            padding: "13px 24px", borderRadius: 8,
            textDecoration: "none", fontSize: 14, fontWeight: 700,
          }}
        >
          Back to Home
        </a>
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block", background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff", padding: "13px 24px", borderRadius: 8,
              textDecoration: "none", fontSize: 14, fontWeight: 600,
            }}
          >
            Contact clinic on WhatsApp
          </a>
        )}
      </div>

      <p style={{ fontSize: 12, color: "rgba(185,200,192,0.5)", marginTop: 40 }}>
        OpenORDO · Encrypted & secure
      </p>
    </div>
  )
}
