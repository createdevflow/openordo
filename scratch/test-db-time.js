const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const appt = await prisma.appointment.findFirst({
    where: { visitType: 'VIDEO', time: '23:40' },
    orderBy: { createdAt: 'desc' },
    include: { clinic: true }
  });
  if (!appt) return console.log('No video appt found');

  const timezone = appt.clinic?.timezone || 'UTC';
  
  const localDateStr = appt.date.toLocaleDateString('en-CA', { timeZone: timezone });
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' }).formatToParts(appt.date);
  const offsetStr = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT';
  
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

  const [hh, mm] = appt.time.split(':').map(Number);
  const pseudoUtc = new Date(`${localDateStr}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00Z`);
  const apptStartUtc = new Date(pseudoUtc.getTime() - offsetMin * 60_000);

  const opensAt   = new Date(apptStartUtc.getTime() - 10 * 60_000);
  const expiresAt = new Date(apptStartUtc.getTime() + (appt.duration + 60) * 60_000);
  const now = new Date();

  console.log({
    timezone, date: appt.date, time: appt.time,
    localDateStr, offsetStr, offsetMin,
    apptStartUtc, opensAt, now,
    isTooEarly: now < opensAt
  });
}
test().finally(() => prisma.$disconnect());
