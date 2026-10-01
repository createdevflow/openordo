/**
 * /consultation/join/[token] — Patient (guest) entry point.
 *
 * Security spec §5: video room links are scoped to one appointment,
 * expire after the appointment window, and are not reusable.
 *
 * Flow:
 *  1. Validate the token server-side (size, DB lookup, time window).
 *  2. On failure: render a clear, non-leaking error page.
 *  3. On success: log the join event and render the consultation room
 *     in guest mode (isHost=false), with appointment data stripped to
 *     only what the patient's view needs.
 */
import { validateJoinAccess, logPatientJoin } from "@/server/actions/video-consultation"
import ConsultationRoomClient from "./ConsultationRoomClient"
import Link from "next/link"

export const dynamic = "force-dynamic"

// ── Error states ──────────────────────────────────────────────────────────────

const T = {
  bg:     "#123025",
  amber:  "#C8862B",
  text:   "#FFFFFF",
  muted:  "#B9C8C0",
  border: "rgba(255,255,255,0.09)",
}

function TokenErrorPage({
  heading,
  body,
}: {
  heading: string
  body: string
}) {
  return (
    <div style={{
      minHeight: "100dvh",
      background: T.bg,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
      color: T.text,
      padding: "24px",
      textAlign: "center",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: "#1E4638",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: 28, marginBottom: 28,
      }}>C</div>

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 12px" }}>
        {heading}
      </h1>
      <p style={{ fontSize: 15, color: T.muted, margin: "0 0 36px", maxWidth: 380 }}>
        {body}
      </p>

      <a
        href="/"
        style={{
          display: "inline-block", background: T.amber, color: T.bg,
          padding: "12px 28px", borderRadius: 8,
          textDecoration: "none", fontSize: 14, fontWeight: 700,
        }}
      >
        Back to Home
      </a>

      <p style={{ fontSize: 12, color: "rgba(185,200,192,0.4)", marginTop: 40 }}>
        OpenORDO · Encrypted &amp; secure
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function UnifiedJoinPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params

  const result = await validateJoinAccess(roomId)

  if (!result.valid) {
    switch (result.reason) {
      case "too_early":
        return (
          <TokenErrorPage
            heading="You're a little early"
            body="This consultation link isn't open yet. Please return closer to your appointment time. The link opens 10 minutes before your scheduled appointment."
          />
        )
      case "expired":
        return (
          <TokenErrorPage
            heading="This link has expired"
            body="Your consultation window has passed. Please contact your clinic to reschedule or get a new link."
          />
        )
      case "not_video":
        return (
          <TokenErrorPage
            heading="Not a video appointment"
            body="This appointment is not scheduled as a video consultation. Please contact your clinic for details."
          />
        )
      default:
        return (
          <TokenErrorPage
            heading="Invalid link"
            body="This consultation link is invalid. Please check the link in your message or contact your clinic for a new one."
          />
        )
    }
  }

  // If patient (not host), log join event
  if (!result.isHost) {
    await logPatientJoin(roomId)
  }

  return (
    <ConsultationRoomClient
      roomId={roomId}
      appointment={result.appointment}
      isHost={result.isHost}
      hasEprescriptions={result.hasEprescriptions}
    />
  )
}
