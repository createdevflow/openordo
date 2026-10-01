"use server"

import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { notifyPatient } from "@/lib/patient-notifications"

export async function createRecordAction(data: {
  patientId: string
  doctorId: string
  date: string
  diagnosis: string
  prescription?: string
  notes?: string
  documentUrl?: string
  documentSize?: number
  documentName?: string
}) {
  const clinicId = await requireClinicId()

  const record = await db.medicalRecord.create({
    data: {
      clinicId,
      patientId: data.patientId,
      doctorId: data.doctorId,
      date: new Date(data.date),
      diagnosis: data.diagnosis,
      prescription: data.prescription,
      notes: data.notes,
      documentUrl: data.documentUrl
    }
  })

  if (data.documentUrl && data.documentSize !== undefined) {
    await db.patientDocument.create({
      data: {
        clinicId,
        patientId: data.patientId,
        name: data.documentName || "Medical Record Document",
        type: "OTHER",
        sizeBytes: data.documentSize,
        url: data.documentUrl
      }
    })
  }

  // Patient portal: notify only if clinic has shareRecordsWithPatients = true
  db.clinic.findUnique({ where: { id: clinicId }, select: { shareRecordsWithPatients: true } })
    .then(clinic => {
      if (clinic?.shareRecordsWithPatients) {
        notifyPatient({
          clinicId,
          patientId: data.patientId,
          type: "RECORD_SHARED",
          title: "New medical record available",
          body: `A new medical record (${data.diagnosis}) has been added and shared with your portal.`,
          relatedId: record.id
        }).catch(console.error)
      }
    }).catch(console.error)

  revalidatePath("/dashboard/records")
  revalidatePath("/dashboard/patients")
  revalidatePath("/dashboard")
  return record
}
