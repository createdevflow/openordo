"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user || session.user.platformRole !== "SUPER_ADMIN") {
    throw new Error("Unauthorized")
  }
  return session
}

export async function logAudit(
  actorUserId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: any
) {
  await db.auditLogEntry.create({
    data: {
      actorUserId,
      action,
      targetType,
      targetId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })
}
