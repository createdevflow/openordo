const timezone = 'Asia/Kolkata';

// 1. Get the local date string (YYYY-MM-DD)
const date = new Date('2026-10-05T00:00:00Z');
const localDateStr = date.toLocaleDateString('en-CA', { timeZone: timezone });
const timeStr = '23:40';
const duration = 30;

// 2. Extract the UTC offset at that exact date (to handle DST correctly)
// Note: we just use midnight of that date as the reference point for DST.
const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' }).formatToParts(date);
const offsetStr = parts.find(p => p.type === 'timeZoneName').value; // e.g. "GMT+05:30", "GMT-04:00", "GMT"

// 3. Parse the offset into minutes
let offsetMin = 0;
if (offsetStr !== 'GMT') {
  const match = offsetStr.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (match) {
    const sign = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2], 10);
    const minutes = match[3] ? parseInt(match[3], 10) : 0;
    offsetMin = sign * (hours * 60 + minutes);
  }
}

// 4. Construct the pseudo-UTC datetime
const [hh, mm] = timeStr.split(':').map(Number);
const pseudoUtc = new Date(`${localDateStr}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00Z`);

// 5. The true UTC time is pseudoUtc MINUS the offset
const apptStartUtc = new Date(pseudoUtc.getTime() - offsetMin * 60 * 1000);

const opensAt   = new Date(apptStartUtc.getTime() - 10 * 60 * 1000);
const expiresAt = new Date(apptStartUtc.getTime() + (duration + 60) * 60 * 1000);
const now = new Date();

console.log({
  localDateStr,
  offsetStr,
  offsetMin,
  pseudoUtc: pseudoUtc.toISOString(),
  apptStartUtc: apptStartUtc.toISOString(),
  opensAt: opensAt.toISOString(),
  opensAtLocal: opensAt.toLocaleString('en-US', { timeZone: timezone }),
  apptStartLocal: apptStartUtc.toLocaleString('en-US', { timeZone: timezone }),
  now: now.toISOString(),
  nowLocal: now.toLocaleString('en-US', { timeZone: timezone }),
  isTooEarly: now < opensAt
});
