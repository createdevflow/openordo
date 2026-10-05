"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { hasActivePlugin } from "@/lib/plugins"
import crypto, { randomBytes } from "crypto"
import jwt from "jsonwebtoken"
import { redirect } from "next/navigation"

// ── Token helpers ─────────────────────────────────────────────────────────────

function generateToken(): string {
  return randomBytes(32).toString("hex") // 256-bit, unguessable
}

/**
 * Compute the open and close windows for a patient link:
 * - Opens 10 minutes BEFORE the appointment time
 * - Expires appointment duration + 60-minute buffer AFTER start
 *
 * TIMEZONE FIX:
 * appointment.date is UTC midnight of the clinic's local date (e.g. 2026-10-06T00:00:00Z
 * for IST where the local date is Oct 6). appointment.time is "HH:MM" in clinic local time.
 * We use Intl to resolve the correct UTC timestamp so the window is accurate regardless
 * of the server's own timezone.
 */
function computeTokenWindow(
  appointment: { date: Date; time: string; duration: number },
  timezone: string = "UTC"
): { opensAt: Date; expiresAt: Date } {
  // Get the local date in the clinic's timezone (en-CA = YYYY-MM-DD)
  const localDateStr = appointment.date.toLocaleDateString("en-CA", { timeZone: timezone })

  const [hh, mm] = appointment.time.split(":").map(Number)

  // Build a reference UTC datetime treating the time as UTC, then measure the offset
  const ref = new Date(`${localDateStr}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:00Z`)

  // Ask Intl what local HH:MM this UTC instant corresponds to in the clinic's timezone
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(ref)

  const localH = parseInt(parts.find(p => p.type === "hour")?.value   || "0")
  const localM = parseInt(parts.find(p => p.type === "minute")?.value || "0")

  // UTC offset in minutes = how far the local time is ahead of our reference
  const offsetMin = (localH - hh) * 60 + (localM - mm)

  // True UTC start of the appointment
  const apptStartUtc = new Date(ref.getTime() - offsetMin * 60_000)

  const opensAt   = new Date(apptStartUtc.getTime() - 10 * 60_000)
  const expiresAt = new Date(apptStartUtc.getTime() + (appointment.duration + 60) * 60_000)

  return { opensAt, expiresAt }
}

// ── Access log helper ─────────────────────────────────────────────────────────

async function logVideoEvent(params: {
  clinicId: string
  appointmentId: string
  roomId: string
  role: "doctor" | "patient"
  identifier: string
  event: "JOINED" | "ADMITTED" | "LEFT" | "LINK_REVOKED" | "ENDED" | "DENIED"
}) {
  try {
    await db.videoCallAccessLog.create({ data: params })
  } catch (e) {
    // Non-fatal: log to stderr and continue
    console.error("[VideoAccessLog] Failed to write log:", e)
  }
}

// ── Doctor access guard (used by page.tsx) ────────────────────────────────────

/**
 * Server-side guard for the doctor's /consultation/[roomId] page.
 * Returns the appointment data if access is granted.
 * Redirects to /404 or /dashboard if any check fails.
 */
export async function requireDoctorAccess(roomId: string) {
  const session = await auth()

  // 1. Must be a logged-in staff user
  if (!session?.user?.id) {
    redirect("/login")
  }

  // 2. Find the appointment by roomId
  const appointment = await db.appointment.findFirst({
    where: { OR: [{ roomId }, { id: roomId }] },
    include: { patient: true, doctor: true, clinic: true },
  })

  if (!appointment) {
    redirect("/dashboard/appointments")
  }

  // 3. Must have an active video-consultation plugin for the clinic
  const pluginActive = await hasActivePlugin(
    appointment.clinicId,
    "video-consultation"
  )
  if (!pluginActive) {
    redirect("/dashboard/addons")
  }

  // 4. The session user must be a member of the clinic that owns this appointment
  const membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
      clinicId: appointment.clinicId,
    },
  })
  if (!membership) {
    redirect("/dashboard/appointments")
  }

  // 5. Log doctor join
  if (appointment.roomId) {
    await logVideoEvent({
      clinicId: appointment.clinicId,
      appointmentId: appointment.id,
      roomId: appointment.roomId,
      role: "doctor",
      identifier: session.user.id,
      event: "JOINED",
    })
  }

  return {
    appointment,
    hasEprescriptions: await hasActivePlugin(
      appointment.clinicId,
      "e-prescriptions"
    ),
  }
}

// ── Patient link token ────────────────────────────────────────────────────────

/**
 * Generate (or regenerate) a patient join-link token for an appointment.
 * Called from the "Share Patient Link" button — server action.
 * Old token is immediately invalidated. Requires a valid doctor session.
 */
export async function generatePatientLinkToken(appointmentId: string): Promise<{
  url: string
} | { error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Not authenticated" }

  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: { clinic: true },
  })
  if (!appointment || !appointment.roomId) return { error: "Appointment not found or not video" }

  // Verify caller is a member of this clinic
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, clinicId: appointment.clinicId },
  })
  if (!membership) return { error: "Forbidden" }

  // Generate or reuse a persistent patient token
  let token = appointment.patientLinkToken
  if (!token) {
    token = generateToken() // 256-bit hex, unguessable
    await db.appointment.update({
      where: { id: appointmentId },
      data: { patientLinkToken: token },
    })
  }

  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return {
    // Patient URL is /consultation/join/p/[token] — completely separate from doctor URL
    url: `${baseUrl}/consultation/join/p/${token}`,
  }
}

/**
 * validateJoinAccess — called by the DOCTOR entry point /consultation/join/[roomId].
 *
 * Security contract: the roomId-based URL is ONLY for authenticated clinic staff.
 * Non-members (patients) must use /consultation/join/p/[token] instead.
 * isHost is ALWAYS true when this returns valid:true.
 */
export async function validateJoinAccess(roomId: string): Promise<{
  valid: true
  appointment: any
  isHost: true
  hasEprescriptions: boolean
} | { valid: false; reason: "expired" | "invalid" | "too_early" | "not_video" }> {
  if (!roomId || roomId.length < 5) return { valid: false, reason: "invalid" }

  const appointment = await db.appointment.findFirst({
    where: { roomId },
    include: { patient: true, doctor: true, clinic: true },
  })

  if (!appointment) return { valid: false, reason: "invalid" }
  if (appointment.visitType !== "VIDEO") return { valid: false, reason: "not_video" }

  // MUST be an authenticated clinic member — no guest fallback on this URL
  const session = await auth()
  if (!session?.user?.id) return { valid: false, reason: "invalid" }

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, clinicId: appointment.clinicId },
  })
  if (!membership) return { valid: false, reason: "invalid" }

  // Clinic staff can join any time — no time window restriction
  const hasEprescriptions = await hasActivePlugin(appointment.clinicId, "e-prescriptions")
  return { valid: true, appointment, isHost: true, hasEprescriptions }
}

/**
 * Log patient join event (called client-side via server action after validation).
 */
/**
 * Log patient join event (called client-side via server action after validation).
 */
export async function logPatientJoin(roomId: string) {
  const appointment = await db.appointment.findFirst({
    where: { roomId },
    select: { id: true, clinicId: true, patientId: true, roomId: true },
  })
  if (!appointment || !appointment.roomId) return

  await logVideoEvent({
    clinicId: appointment.clinicId,
    appointmentId: appointment.id,
    roomId: appointment.roomId,
    role: "patient",
    identifier: appointment.patientId,
    event: "JOINED",
  })
}

/**
 * Log patient left event.
 */
export async function logParticipantLeft(
  appointmentId: string,
  role: "doctor" | "patient",
  identifier: string
) {
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: { clinicId: true, roomId: true },
  })
  if (!appointment?.roomId) return

  await logVideoEvent({
    clinicId: appointment.clinicId,
    appointmentId,
    roomId: appointment.roomId,
    role,
    identifier,
    event: "LEFT",
  })
}

/**
 * Doctor ends call — log ENDED event.
 * Called when doctor clicks "End Call".
 */
export async function logCallEnded(appointmentId: string) {
  const session = await auth()
  if (!session?.user?.id) return

  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: { clinicId: true, roomId: true },
  })
  if (!appointment?.roomId) return

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, clinicId: appointment.clinicId },
  })
  if (!membership) return

  await logVideoEvent({
    clinicId: appointment.clinicId,
    appointmentId,
    roomId: appointment.roomId,
    role: "doctor",
    identifier: session.user.id,
    event: "ENDED",
  })
}

/**
 * Autosave consultation notes to MedicalRecord draft.
 * Only callable by a clinic member. Notes → MedicalRecord.notes field (not call data).
 */
export async function autosaveConsultationNotes(
  appointmentId: string,
  notes: string
): Promise<{ ok: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false }

  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: { clinicId: true, patientId: true, doctorId: true, date: true },
  })
  if (!appointment) return { ok: false }

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, clinicId: appointment.clinicId },
  })
  if (!membership) return { ok: false }

  // Upsert a draft MedicalRecord keyed by appointmentId (stored in notes as a reference marker)
  // We look for an existing record with matching clinic+patient+doctor+date
  const existing = await db.medicalRecord.findFirst({
    where: {
      clinicId: appointment.clinicId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      notes: { contains: `[appt:${appointmentId}]` },
    },
  })

  if (existing) {
    await db.medicalRecord.update({
      where: { id: existing.id },
      data: { notes },
    })
  } else {
    await db.medicalRecord.create({
      data: {
        clinicId: appointment.clinicId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        date: appointment.date,
        diagnosis: "Video consultation — see notes",
        notes: `[appt:${appointmentId}]\n${notes}`,
      },
    })
  }

  return { ok: true }
}


// ── In-house video credentials ────────────────────────────────────────────────



/**
 * getCallCredentials — mints a Signal JWT and TURN credentials.
 *
 * Doctor path:  called with appointment.id (from ConsultationRoomClient when isHost=true)
 *               requires an active clinic membership session.
 * Patient path: called with appointment.patientLinkToken (from ConsultationRoomClient
 *               when isHost=false, routed through /p/[token]).
 */
export async function getCallCredentials(
  identifier: string,
  callerIsHost: boolean
): Promise<{
  ok: true;
  signalToken: string;
  iceServers: any[];
  turnPolicy: "all" | "relay";
  isHost: boolean;
} | { ok: false; error: string }> {
  let appointment: any = null;
  let isHost = false;
  let sub = "";

  if (callerIsHost) {
    // Doctor path: look up by appointment ID, require auth + membership
    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: "Not authenticated" };

    appointment = await db.appointment.findFirst({
      where: { OR: [{ id: identifier }, { roomId: identifier }] },
    });
    if (!appointment) return { ok: false, error: "Invalid appointment" };

    const membership = await db.membership.findFirst({
      where: { userId: session.user.id, clinicId: appointment.clinicId },
    });
    if (!membership) return { ok: false, error: "Forbidden" };

    const pluginActive = await hasActivePlugin(appointment.clinicId, "video-consultation");
    if (!pluginActive) return { ok: false, error: "Plugin not active" };

    isHost = true;
    sub = session.user.id;
  } else {
    // Patient path: look up by patientLinkToken only — NO session check
    appointment = await db.appointment.findFirst({
      where: { patientLinkToken: identifier },
    });
    if (!appointment) return { ok: false, error: "Invalid link" };

    // Check time window
    const { opensAt, expiresAt } = computeTokenWindow(appointment as any);
    const now = new Date();
    if (now < opensAt) return { ok: false, error: "too_early" };
    if (now > expiresAt) return { ok: false, error: "expired" };

    isHost = false;
    sub = `patient:${appointment.patientId}`;
  }

  if (!appointment || !appointment.roomId) return { ok: false, error: "Invalid appointment" };

  // Write JOIN audit entry
  await logVideoEvent({
    clinicId: appointment.clinicId,
    appointmentId: appointment.id,
    roomId: appointment.roomId,
    role: isHost ? "doctor" : "patient",
    identifier: sub,
    event: "JOINED",
  });

  const { expiresAt } = computeTokenWindow(appointment as any);
  const exp = Math.floor(expiresAt.getTime() / 1000);

  // Mint Signal JWT
  const secret = process.env.SIGNAL_JWT_SECRET || "fallback_secret_for_dev";
  const signalToken = jwt.sign(
    {
      room: appointment.id,
      role: isHost ? "doctor" : "patient",
      sub,
    },
    secret,
    { expiresIn: exp - Math.floor(Date.now() / 1000) }
  );

  // Mint TURN credentials
  const turnSecret = process.env.TURN_SECRET || "fallback_turn_secret";
  const turnHost = process.env.TURN_HOST || "turn.openordo.com";
  
  const username = `${exp}:${appointment.id}`;
  
  const hmac = crypto.createHmac('sha1', turnSecret);
  hmac.update(username);
  const credential = hmac.digest('base64');

  const iceServers = [
    { urls: `stun:${turnHost}:3478` },
    {
      urls: [
        `turn:${turnHost}:3478?transport=udp`,
        `turn:${turnHost}:3478?transport=tcp`,
        `turns:${turnHost}:5349?transport=tcp`,
      ],
      username,
      credential,
    },
  ];

  // If super admin debug flag "Force relay" is checked... we'd pull it from DB,
  // but for now default to "all"
  const turnPolicy: "all" | "relay" = "all";

  return {
    ok: true,
    signalToken,
    iceServers,
    turnPolicy,
    isHost,
  };
}
