const fs = require('fs');
let code = fs.readFileSync('src/server/actions/video-consultation.ts', 'utf8');

// Replace generatePatientLinkToken
code = code.replace(/export async function generatePatientLinkToken[\s\S]*?url: \`\$\{baseUrl\}\/consultation\/join\/\$\{appointment\.roomId\}\`,\n  \}\n\}/,
`export async function generatePatientLinkToken(appointmentId: string): Promise<{
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

  // Generate real secure token instead of returning roomId
  let token = appointment.patientLinkToken;
  if (!token) {
    token = crypto.randomBytes(32).toString("hex")
    await db.appointment.update({
      where: { id: appointmentId },
      data: { patientLinkToken: token }
    })
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  return {
    url: \`\${baseUrl}/consultation/join/\${token}\`,
  }
}`);

// Replace validateJoinAccess
code = code.replace(/export async function validateJoinAccess\(roomId: string\): Promise<\{[\s\S]*?if \(!appointment\) return \{ valid: false, reason: "invalid" \}\n  if \(appointment.visitType !== "VIDEO"\) return \{ valid: false, reason: "not_video" \}\n\n  const session = await auth\(\)\n  let isHost = false\n\n  if \(session\?.user\?.id\) \{\n    const membership = await db.membership.findFirst\(\{\n      where: \{ userId: session.user.id, clinicId: appointment.clinicId \},\n    \}\)\n    if \(membership\) \{\n      isHost = true\n    \}\n  \}/,
`export async function validateJoinAccess(tokenOrRoomId: string): Promise<{
  valid: true
  appointment: any
  isHost: boolean
  hasEprescriptions: boolean
} | { valid: false; reason: "expired" | "invalid" | "too_early" | "not_video" }> {
  if (!tokenOrRoomId || tokenOrRoomId.length < 5) return { valid: false, reason: "invalid" }

  const appointment = await db.appointment.findFirst({
    where: {
      OR: [
        { roomId: tokenOrRoomId },
        { patientLinkToken: tokenOrRoomId }
      ]
    },
    include: { patient: true, doctor: true, clinic: true },
  })

  if (!appointment) return { valid: false, reason: "invalid" }
  if (appointment.visitType !== "VIDEO") return { valid: false, reason: "not_video" }

  let isHost = false

  if (appointment.roomId === tokenOrRoomId) {
    // Attempting to join as Host (via Dashboard / roomId)
    const session = await auth()
    if (session?.user?.id) {
      const membership = await db.membership.findFirst({
        where: { userId: session.user.id, clinicId: appointment.clinicId },
      })
      if (membership) {
        isHost = true
      }
    }
    if (!isHost) {
      return { valid: false, reason: "invalid" }
    }
  } else {
    // Joined via patientLinkToken
    isHost = false
  }`);

fs.writeFileSync('src/server/actions/video-consultation.ts', code);
