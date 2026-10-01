"use server"

import { db } from "@/lib/db"
import { getPatientAccountSession } from "@/lib/patient-auth"
import { requireClinicId } from "@/lib/auth-utils"
import { requireSuperAdmin } from "@/server/actions/admin-base"
import { sendNotificationEmail } from "@/lib/notifications/send"
import { renderDataExportReady } from "@/lib/notifications/templates"
import { revalidatePath } from "next/cache"

// --- Patient side ---

export async function requestDataExportAction(clinicId: string) {
  try {
    const session = await getPatientAccountSession()
    if (!session) throw new Error("Unauthorized")

    // Check if there is already a pending request
    const existing = await db.dataExportRequest.findFirst({
      where: { patientAccountId: session.patientAccountId, clinicId, status: "PENDING" }
    })

    if (existing) {
      return { error: "You already have a pending data export request for this clinic." }
    }

    const req = await db.dataExportRequest.create({
      data: {
        patientAccountId: session.patientAccountId,
        clinicId,
      },
      include: {
        patientAccount: true,
        clinic: {
          include: {
            memberships: {
              where: { role: "OWNER" },
              include: { user: true }
            }
          }
        }
      }
    })

    // Log that owners should process the request (handled via admin dashboard)
    console.log(`[DATA_EXPORT_REQUEST] Clinic ${req.clinic.name} — patient ${req.patientAccount.name} (${req.patientAccount.email}) requested export.`)

    return { success: true, request: req }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function getPatientDataExportsAction(clinicId: string) {
  try {
    const session = await getPatientAccountSession()
    if (!session) throw new Error("Unauthorized")

    const reqs = await db.dataExportRequest.findMany({
      where: { patientAccountId: session.patientAccountId, clinicId },
      orderBy: { createdAt: "desc" }
    })

    return { success: true, requests: reqs }
  } catch (e: any) {
    return { error: e.message, requests: [] }
  }
}

// --- Admin side ---

export async function adminGetDataRequestsAction() {
  await requireSuperAdmin()
  return await db.dataExportRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      patientAccount: { select: { name: true, email: true } },
      clinic: { select: { name: true } }
    }
  })
}

export async function adminProcessDataRequestAction(id: string) {
  await requireSuperAdmin()
  return await processDataRequest(id)
}

// --- Clinic side ---

export async function clinicGetDataRequestsAction() {
  const clinicId = await requireClinicId()
  return await db.dataExportRequest.findMany({
    where: { clinicId },
    orderBy: { createdAt: "desc" },
    include: {
      patientAccount: { select: { name: true, email: true } }
    }
  })
}

export async function clinicProcessDataRequestAction(id: string) {
  const clinicId = await requireClinicId()
  
  // Verify it belongs to clinic
  const req = await db.dataExportRequest.findUnique({ where: { id } })
  if (!req || req.clinicId !== clinicId) throw new Error("Not found or unauthorized")

  return await processDataRequest(id)
}

// --- Internal Processing Logic ---

async function processDataRequest(id: string) {
  try {
    const req = await db.dataExportRequest.findUnique({
      where: { id },
      include: {
        patientAccount: true,
        clinic: true
      }
    })

    if (!req) throw new Error("Request not found")
    if (req.status === "COMPLETED") return { error: "Already completed" }

    // Zip generation
    const mockZipUrl = `/api/export/patient-request?id=${req.id}`

    await db.dataExportRequest.update({
      where: { id },
      data: {
        status: "COMPLETED",
        downloadUrl: mockZipUrl,
        completedAt: new Date()
      }
    })

    // In-app notification for patient
    await db.patientNotification.create({
      data: {
        patientAccountId: req.patientAccountId,
        clinicId: req.clinicId,
        type: "RECORD_SHARED",
        title: "Data Export Ready",
        body: "Your requested data export has been processed and is ready for download.",
        relatedId: mockZipUrl
      }
    })

    // Email: DATA_EXPORT_READY (mandatory — GDPR/legal)
    if (req.patientAccount.email) {
      const APP = process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      sendNotificationEmail(
        "DATA_EXPORT_READY",
        { toEmail: req.patientAccount.email, ownerType: "PATIENT_ACCOUNT", ownerId: req.patientAccountId, clinicId: req.clinicId },
        renderDataExportReady({
          name: req.patientAccount.name,
          clinicName: req.clinic.name,
          downloadUrl: `${APP}${mockZipUrl}`,
          expiresAt: expiresAt.toLocaleDateString(),
        })
      ).catch(console.error)
    }

    revalidatePath("/admin/data-requests")
    revalidatePath("/dashboard/settings")
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}
