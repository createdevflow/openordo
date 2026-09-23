"use server"

import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"

export async function getStorageStats() {
  let clinicId;
  try { clinicId = await requireClinicId(); } catch { return { ok: false, error: "Unauthorized" } }

  const [clinic, aggregation, breakdownRows] = await Promise.all([
    db.clinic.findUnique({
      where: { id: clinicId },
      include: {
        subscription: { include: { plan: true } },
        clinicPlugins: {
          where: { status: "ACTIVE", plugin: { slug: "document-storage" } },
        }
      }
    }),
    db.patientDocument.aggregate({
      _sum: { sizeBytes: true },
      where: { clinicId },
    }),
    db.patientDocument.groupBy({
      by: ['type'],
      _sum: { sizeBytes: true },
      where: { clinicId }
    })
  ])

  if (!clinic) return { ok: false, error: "Clinic not found" }
  
  const baseStorageGb = clinic.subscription?.plan?.storageLimitGb || 0
  const addonStorageGb = clinic.clinicPlugins.reduce((acc: number, p: any) => acc + (p.quantity * 10), 0)
  const totalStorageBytes = (baseStorageGb + addonStorageGb) * 1024 * 1024 * 1024

  let labReportsBytes = 0;
  let xraysBytes = 0;
  let prescriptionsBytes = 0;
  let othersBytes = 0;

  breakdownRows.forEach((row: any) => {
    const size = row._sum.sizeBytes || 0;
    if (row.type === "LAB_REPORT") labReportsBytes += size;
    else if (row.type === "XRAY") xraysBytes += size;
    else if (row.type === "PRESCRIPTION") prescriptionsBytes += size;
    else othersBytes += size;
  });

  return {
    ok: true,
    usedBytes: aggregation._sum.sizeBytes || 0,
    totalBytes: totalStorageBytes,
    baseStorageGb,
    addonStorageGb,
    isUnlimited: totalStorageBytes === 0 && (baseStorageGb === 0 || baseStorageGb === null),
    breakdown: {
      labReportsBytes,
      xraysBytes,
      prescriptionsBytes,
      othersBytes
    }
  }
}

export async function getVaultDocuments(type?: string) {
  let clinicId;
  try { clinicId = await requireClinicId(); } catch { return { ok: false, error: "Unauthorized" } }

  const where: any = { clinicId }
  if (type) {
    where.type = type
  }

  const documents = await db.patientDocument.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      patient: {
        select: { name: true, displayId: true },
      },
    },
  })

  return { ok: true, documents }
}

export async function createPatientDocumentAction(data: {
  patientId: string
  name: string
  type: string
  sizeBytes: number
  url: string
}) {
  const clinicId = await requireClinicId()
  
  const doc = await db.patientDocument.create({
    data: {
      clinicId,
      patientId: data.patientId,
      name: data.name,
      type: data.type,
      sizeBytes: data.sizeBytes,
      url: data.url
    }
  })

  return { ok: true, document: doc }
}
