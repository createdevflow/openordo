const fs = require('fs');

const videoTs = 'src/server/actions/video-consultation.ts';
let code1 = fs.readFileSync(videoTs, 'utf8');

const newFn = `/**
 * Compute the open and close windows for a patient link:
 * - Opens 10 minutes BEFORE the appointment time
 * - Expires appointment duration + 60-minute buffer AFTER start
 *
 * TIMEZONE FIX:
 * Uses longOffset (e.g. GMT+05:30) to compute true UTC without cross-day modulo bugs.
 */
function computeTokenWindow(
  appointment: { date: Date; time: string; duration: number },
  timezone: string = "UTC"
): { opensAt: Date; expiresAt: Date } {
  const localDateStr = appointment.date.toLocaleDateString("en-CA", { timeZone: timezone })
  
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset" }).formatToParts(appointment.date)
  const offsetStr = parts.find(p => p.type === "timeZoneName")?.value || "GMT"
  
  let offsetMin = 0
  if (offsetStr !== "GMT") {
    const match = offsetStr.match(/GMT([+-])(\\d{1,2})(?::(\\d{2}))?/)
    if (match) {
      const sign = match[1] === "+" ? 1 : -1
      const hours = parseInt(match[2], 10)
      const minutes = match[3] ? parseInt(match[3], 10) : 0
      offsetMin = sign * (hours * 60 + minutes)
    }
  }

  const [hh, mm] = appointment.time.split(":").map(Number)
  const pseudoUtc = new Date(\`\${localDateStr}T\${String(hh).padStart(2,"0")}:\${String(mm).padStart(2,"0")}:00Z\`)
  const apptStartUtc = new Date(pseudoUtc.getTime() - offsetMin * 60_000)

  const opensAt   = new Date(apptStartUtc.getTime() - 10 * 60_000)
  const expiresAt = new Date(apptStartUtc.getTime() + (appointment.duration + 60) * 60_000)

  return { opensAt, expiresAt }
}`;

code1 = code1.replace(/function computeTokenWindow[\s\S]*?return \{ opensAt, expiresAt \}\r?\n\}/, newFn);
fs.writeFileSync(videoTs, code1);

const pageTs = 'src/app/consultation/join/p/[token]/page.tsx';
let code2 = fs.readFileSync(pageTs, 'utf8');

const newInline = `  // Time-window check (timezone-correct)
  const timezone = (appointment.clinic as any)?.timezone || "UTC"
  const localDateStr = appointment.date.toLocaleDateString("en-CA", { timeZone: timezone })
  
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset" }).formatToParts(appointment.date)
  const offsetStr = parts.find(p => p.type === "timeZoneName")?.value || "GMT"
  
  let offsetMin = 0
  if (offsetStr !== "GMT") {
    const match = offsetStr.match(/GMT([+-])(\\d{1,2})(?::(\\d{2}))?/)
    if (match) {
      const sign = match[1] === "+" ? 1 : -1
      const hours = parseInt(match[2], 10)
      const minutes = match[3] ? parseInt(match[3], 10) : 0
      offsetMin = sign * (hours * 60 + minutes)
    }
  }

  const [hh, mm] = appointment.time.split(":").map(Number)
  const pseudoUtc = new Date(\`\${localDateStr}T\${String(hh).padStart(2,"0")}:\${String(mm).padStart(2,"0")}:00Z\`)
  const apptStartUtc = new Date(pseudoUtc.getTime() - offsetMin * 60_000)

  const opensAt   = new Date(apptStartUtc.getTime() - 10 * 60_000)
  const expiresAt = new Date(apptStartUtc.getTime() + (appointment.duration + 60) * 60_000)
  const now = new Date()`;

code2 = code2.replace(/  \/\/ Time-window check \(timezone-correct\)[\s\S]*?const now = new Date\(\)/, newInline);
fs.writeFileSync(pageTs, code2);

console.log("Done updating both files");
