const fs = require('fs');
let code = fs.readFileSync('src/server/actions/video-consultation.ts', 'utf8');

// Replace computeTokenWindow using regex
code = code.replace(/function computeTokenWindow\([\s\S]*?return \{ opensAt, expiresAt \}\s*\}/, 
`function computeTokenWindow(appointment: {
  date: Date
  time: string
  duration: number
}, timezone: string = "UTC"): { opensAt: Date; expiresAt: Date } {
  // Map appointment date and time into a string we can parse
  const dateStr = appointment.date.toISOString().split("T")[0] // "2026-10-03"
  const apptStart = new Date(\`\${dateStr}T\${appointment.time}:00\`)

  const opensAt = new Date(apptStart.getTime() - 10 * 60 * 1000)
  const expiresAt = new Date(
    apptStart.getTime() + (appointment.duration + 60) * 60 * 1000
  )
  return { opensAt, expiresAt }
}`);

// Replace validateJoinAccess patient check
code = code.replace(/\/\/ If not host \(patient guest\), check time window[\s\S]*?if \(now > expiresAt\) return \{ valid: false, reason: "expired" \}\s*\}/,
`// If not host (patient guest), check time window
  if (!isHost) {
    const timezone = appointment.clinic?.timezone || "UTC"
    
    // Map current UTC time into the clinic's local time string, then parse it locally
    const nowStr = new Date().toLocaleString("en-US", { timeZone: timezone, hourCycle: "h23" })
    const now = new Date(nowStr)
    
    const { opensAt, expiresAt } = computeTokenWindow(appointment as any, timezone)

    if (now < opensAt) return { valid: false, reason: "too_early" }
    if (now > expiresAt) return { valid: false, reason: "expired" }
  }`);

fs.writeFileSync('src/server/actions/video-consultation.ts', code);
