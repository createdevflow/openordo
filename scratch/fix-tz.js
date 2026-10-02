const fs = require('fs');
let code = fs.readFileSync('src/server/actions/video-consultation.ts', 'utf8');

const t1 = `function computeTokenWindow(appointment: {
  date: Date
  time: string
  duration: number
}): { opensAt: Date; expiresAt: Date } {
  const [hours, minutes] = appointment.time.split(":").map(Number)
  const apptStart = new Date(appointment.date)
  apptStart.setHours(hours, minutes, 0, 0)

  const opensAt = new Date(apptStart.getTime() - 10 * 60 * 1000)
  const expiresAt = new Date(
    apptStart.getTime() + (appointment.duration + 60) * 60 * 1000
  )
  return { opensAt, expiresAt }
}`;

const r1 = `function computeTokenWindow(appointment: {
  date: Date
  time: string
  duration: number
}, timezone: string = "UTC"): { opensAt: Date; expiresAt: Date } {
  const dateStr = appointment.date.toISOString().split("T")[0]
  const apptStart = new Date(\`\${dateStr}T\${appointment.time}:00\`)

  const opensAt = new Date(apptStart.getTime() - 10 * 60 * 1000)
  const expiresAt = new Date(
    apptStart.getTime() + (appointment.duration + 60) * 60 * 1000
  )
  return { opensAt, expiresAt }
}`;

const t2 = `  // If not host (patient guest), check time window
  if (!isHost) {
    const now = new Date()
    const { opensAt, expiresAt } = computeTokenWindow(appointment as any)

    if (now < opensAt) return { valid: false, reason: "too_early" }
    if (now > expiresAt) return { valid: false, reason: "expired" }
  }`;

const r2 = `  // If not host (patient guest), check time window
  if (!isHost) {
    const timezone = appointment.clinic?.timezone || "UTC"
    const nowStr = new Date().toLocaleString("en-US", { timeZone: timezone, hourCycle: "h23" })
    const now = new Date(nowStr)
    const { opensAt, expiresAt } = computeTokenWindow(appointment as any, timezone)

    if (now < opensAt) return { valid: false, reason: "too_early" }
    if (now > expiresAt) return { valid: false, reason: "expired" }
  }`;

code = code.replace(t1, r1);
code = code.replace(t2, r2);
fs.writeFileSync('src/server/actions/video-consultation.ts', code);
