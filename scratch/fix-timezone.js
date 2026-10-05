const fs = require('fs');
let code = fs.readFileSync('src/server/actions/video-consultation.ts', 'utf8');

const oldFn = `/**
 * Compute the open and close windows for a patient link:
 * - Opens 10 minutes BEFORE the appointment time
 * - Expires appointment duration + 60-minute buffer AFTER start
 */
function computeTokenWindow(appointment: {
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
}`;

const newFn = `/**
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
  const ref = new Date(\`\${localDateStr}T\${String(hh).padStart(2,"0")}:\${String(mm).padStart(2,"0")}:00Z\`)

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
}`;

// Normalize CRLF to LF for the match
const normalised = code.replace(/\r\n/g, '\n');
const oldFnNorm = oldFn.replace(/\r\n/g, '\n');

if (!normalised.includes(oldFnNorm)) {
  // Try a more lenient match — just replace the function body
  console.log("Exact match failed, trying lenient replace...");
  const replaced = normalised.replace(
    /function computeTokenWindow[\s\S]*?return \{ opensAt, expiresAt \}\n\}/,
    newFn
  );
  if (replaced === normalised) {
    console.error("FAILED: could not find computeTokenWindow to replace");
    process.exit(1);
  }
  fs.writeFileSync('src/server/actions/video-consultation.ts', replaced);
} else {
  fs.writeFileSync('src/server/actions/video-consultation.ts', normalised.replace(oldFnNorm, newFn));
}
console.log("Done");
