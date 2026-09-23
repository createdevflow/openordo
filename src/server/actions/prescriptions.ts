"use server"

import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { hasActivePlugin } from "@/lib/plugins"
import { revalidatePath } from "next/cache"

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
        name: data.documentName || `Prescription ${prescription.id.substring(0,6)}`,
        type: "PRESCRIPTION",
        sizeBytes: data.documentSize,
        url: data.documentUrl
      }
    })
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
