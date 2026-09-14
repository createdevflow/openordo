"use server"

import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"

export async function createRecordAction(data: {
  patientId: string
  doctorId: string
  date: string
  diagnosis: string
  prescription?: string
  notes?: string
  documentUrl?: string
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

  revalidatePath("/dashboard/records")
  revalidatePath("/dashboard/patients")
  revalidatePath("/dashboard")
  return record
}
