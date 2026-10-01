"use server"

import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { hasActivePlugin } from "@/lib/plugins"
import { revalidatePath } from "next/cache"
import { notifyPatient } from "@/lib/patient-notifications"
import { sendNotificationEmail } from "@/lib/notifications/send"
import { renderPrescriptionIssued } from "@/lib/notifications/templates"

export async function createPrescriptionAction(data: {
  patientId: string
  doctorId: string
  date: string
  items: Array<{
    drug: string
    dosage: string
    frequency: string
    durationDays: number
    notes?: string
  }>
  recordId?: string
  documentUrl?: string
  documentSize?: number
  documentName?: string
}) {
  const clinicId = await requireClinicId()
  const hasPlugin = await hasActivePlugin(clinicId, "e-prescriptions")
  if (!hasPlugin) {
    throw new Error("E-Prescriptions add-on is not active for this clinic.")
  }

  const prescription = await db.prescription.create({
    data: {
      clinicId,
      patientId: data.patientId,
      doctorId: data.doctorId,
      date: new Date(data.date),
      items: JSON.stringify(data.items),
      recordId: data.recordId || null
    }
  })

  if (data.documentUrl && data.documentSize !== undefined) {
    await db.patientDocument.create({
      data: {
        clinicId,
        patientId: data.patientId,
        name: data.documentName || `Prescription ${prescription.id.substring(0, 6)}`,
        type: "PRESCRIPTION",
        sizeBytes: data.documentSize,
        url: data.documentUrl
      }
    })
  }

  // Patient portal: notify patient of new prescription
  notifyPatient({
    clinicId,
    patientId: data.patientId,
    type: "PRESCRIPTION_ISSUED",
    title: "New prescription issued",
    body: `A prescription has been issued for you. Log in to the patient portal to view it.`,
    relatedId: prescription.id
  }).catch(console.error)

  // Email: PRESCRIPTION_ISSUED (PHI-safe: no drug names / clinical content in email)
  const rxPatient = await db.patient.findUnique({ where: { id: data.patientId }, include: { clinic: true } })
  if (rxPatient?.email) {
    const APP = process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"
    const patientAccount = await db.patientAccount.findFirst({ where: { email: rxPatient.email } })
    sendNotificationEmail(
      "PRESCRIPTION_ISSUED",
      { toEmail: rxPatient.email, ownerType: "PATIENT_ACCOUNT", ownerId: patientAccount?.id || null, clinicId },
      renderPrescriptionIssued({
        patientName: rxPatient.name,
        clinicName: rxPatient.clinic.name,
        loginUrl: `${APP}/patient-portal`,
        preferencesUrl: `${APP}/patient-portal/settings`,
      })
    ).catch(console.error)
  }

  revalidatePath("/dashboard/prescriptions")
  revalidatePath("/dashboard/records")
  return { success: true, prescription }
}

export async function deletePrescriptionAction(id: string) {
  const clinicId = await requireClinicId()
  await db.prescription.deleteMany({
    where: { id, clinicId }
  })

  revalidatePath("/dashboard/prescriptions")
  return { success: true }
}
