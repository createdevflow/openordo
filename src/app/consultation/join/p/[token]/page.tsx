/**
 * /consultation/join/p/[token] — Patient (guest) entry point.
 *
 * This URL is ONLY for patients. The token in the URL is the
 * patientLinkToken stored on the appointment. It NEVER checks
 * the user's auth session — anyone with this link is treated as
 * a patient (isHost = false), unconditionally.
 */
import { db } from "@/lib/db"
import ConsultationRoomClient from "../../[roomId]/ConsultationRoomClient"

export const dynamic = "force-dynamic"

const T = {
  bg: "#123025",
  amber: "#C8862B",
  text: "#FFFFFF",
  muted: "#B9C8C0",
}

function ErrorPage({ heading, body }: { heading: string; body: string }) {
  return (
    <div style={{
      minHeight: "100dvh", background: T.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, sans-serif", color: T.text, padding: "24px", textAlign: "center",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14, background: "#1E4638",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: 28, marginBottom: 28,
      }}>C</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 12px" }}>{heading}</h1>
      <p style={{ fontSize: 15, color: T.muted, margin: "0 0 36px", maxWidth: 380 }}>{body}</p>
      <a href="/" style={{
        display: "inline-block", background: T.amber, color: T.bg,
        padding: "12px 28px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 700,
      }}>Back to Home</a>
    </div>
  )
}

export default async function PatientJoinPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  if (!token || token.length < 10) {
    return <ErrorPage heading="Invalid link" body="This consultation link is invalid. Please check the link in your email or contact your clinic." />
  }

  const appointment = await db.appointment.findFirst({
    where: { patientLinkToken: token },
    include: { patient: true, doctor: true, clinic: true },
  })

  if (!appointment) {
    return <ErrorPage heading="Invalid link" body="This consultation link is invalid or has already been used. Please contact your clinic for a new one." />
  }

  if (appointment.visitType !== "VIDEO") {
    return <ErrorPage heading="Not a video appointment" body="This appointment is not scheduled as a video consultation. Please contact your clinic for details." />
  }

  // Time-window check (timezone-correct)
  const timezone = (appointment.clinic as any)?.timezone || "UTC"
  const localDateStr = appointment.date.toLocaleDateString("en-CA", { timeZone: timezone })
  
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset" }).formatToParts(appointment.date)
  const offsetStr = parts.find(p => p.type === "timeZoneName")?.value || "GMT"
  
  let offsetMin = 0
  if (offsetStr !== "GMT") {
    const match = offsetStr.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
    if (match) {
      const sign = match[1] === "+" ? 1 : -1
      const hours = parseInt(match[2], 10)
      const minutes = match[3] ? parseInt(match[3], 10) : 0
      offsetMin = sign * (hours * 60 + minutes)
    }
  }

  const [hh, mm] = appointment.time.split(":").map(Number)
  const pseudoUtc = new Date(`${localDateStr}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:00Z`)
  const apptStartUtc = new Date(pseudoUtc.getTime() - offsetMin * 60_000)

  const opensAt   = new Date(apptStartUtc.getTime() - 10 * 60_000)
  const expiresAt = new Date(apptStartUtc.getTime() + (appointment.duration + 60) * 60_000)
  const now = new Date()

  if (now < opensAt) {
    return <ErrorPage
      heading="You're a little early"
      body="This consultation link isn't open yet. Please return closer to your appointment time. The link opens 10 minutes before your scheduled appointment."
    />
  }
  if (now > expiresAt) {
    return <ErrorPage
      heading="This link has expired"
      body="Your consultation window has passed. Please contact your clinic to reschedule or get a new link."
    />
  }

  // Patient is always isHost=false — no auth check whatsoever
  return (
    <ConsultationRoomClient
      roomId={appointment.roomId!}
      appointment={appointment}
      isHost={false}
      hasEprescriptions={false}
    />
  )
}
