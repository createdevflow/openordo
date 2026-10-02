const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

schema += `
model CallQualityLog {
  id             String   @id @default(cuid())
  appointmentId  String
  role           String   // "host" | "guest"
  durationSec    Int
  connectionType String   // "host" | "srflx" | "relay"
  videoCodec     String?
  audioCodec     String?
  avgRttMs       Int?
  avgLossPct     Float?
  avgSendKbps    Int?
  avgRecvKbps    Int?
  lowestTier     String?
  iceRestarts    Int      @default(0)
  wsReconnects   Int      @default(0)
  failureReason  String?
  browser        String?
  os             String?
  createdAt      DateTime @default(now())

  appointment Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
}

model ConsultationMessage {
  id            String   @id @default(cuid())
  appointmentId String
  sender        String   // "Doctor" | "Patient" | "System"
  text          String
  time          String
  createdAt     DateTime @default(now())

  appointment Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
}
`;

// Need to update Appointment to include these relations
schema = schema.replace(
  `  videoAccessLogs VideoCallAccessLog[]`,
  `  videoAccessLogs VideoCallAccessLog[]\n  callQualityLogs CallQualityLog[]\n  consultationMessages ConsultationMessage[]`
);

fs.writeFileSync('prisma/schema.prisma', schema);
