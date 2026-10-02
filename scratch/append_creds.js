// ── In-house video credentials ────────────────────────────────────────────────

import jwt from "jsonwebtoken";

export async function getCallCredentials(identifier: string): Promise<{
  ok: true;
  signalToken: string;
  iceServers: any[];
  turnPolicy: "all" | "relay";
  isHost: boolean;
} | { ok: false; error: string }> {
  // 1. Determine if this is a doctor (roomId) or patient (patientLinkToken)
  let appointment;
  let isHost = false;
  let sub = "";

  const session = await auth();

  // Try to find by roomId first (doctor path)
  appointment = await db.appointment.findFirst({
    where: { OR: [{ roomId: identifier }, { id: identifier }] },
  });

  if (appointment && session?.user?.id) {
    // Check doctor access
    const membership = await db.membership.findFirst({
      where: { userId: session.user.id, clinicId: appointment.clinicId },
    });
    if (membership) {
      const pluginActive = await hasActivePlugin(appointment.clinicId, "video-consultation");
      if (pluginActive) {
        isHost = true;
        sub = session.user.id;
      }
    }
  }

  // If not host, try by patientLinkToken (patient path)
  if (!isHost) {
    appointment = await db.appointment.findFirst({
      where: { patientLinkToken: identifier },
    });
    if (!appointment) {
      // Maybe they passed a roomId but aren't logged in, check join window
      appointment = await db.appointment.findFirst({
        where: { roomId: identifier },
      });
      if (!appointment) return { ok: false, error: "Invalid appointment" };
    }
    
    const now = new Date();
    const { opensAt, expiresAt } = computeTokenWindow(appointment as any);
    if (now < opensAt) return { ok: false, error: "too_early" };
    if (now > expiresAt) return { ok: false, error: "expired" };
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
  
  const crypto = require('crypto');
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
  let turnPolicy: "all" | "relay" = "all";

  return {
    ok: true,
    signalToken,
    iceServers,
    turnPolicy,
    isHost,
  };
}
