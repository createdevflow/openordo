const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const appts = await prisma.appointment.findMany({
    where: { visitType: 'VIDEO' },
    orderBy: { createdAt: 'desc' },
    take: 2,
    include: { clinic: true }
  });
  console.log(appts.map(a => ({
    id: a.id,
    roomId: a.roomId,
    patientLinkToken: a.patientLinkToken,
    date: a.date,
    time: a.time
  })));
}
test().finally(() => prisma.$disconnect());
