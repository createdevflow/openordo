import { db } from "@/lib/db"
import { AuditLogClient } from "./AuditLogClient"

export default async function AdminAuditLogPage() {
  const logs = await db.auditLogEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
  })

  return <AuditLogClient logs={logs} />
}
