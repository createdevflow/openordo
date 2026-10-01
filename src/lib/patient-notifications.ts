"use server"

import { db } from "@/lib/db"

type NotifType =
  | "APPOINTMENT_CONFIRMED"
  | "APPOINTMENT_UPDATED"
  | "INVOICE_CREATED"
  | "INVOICE_PAID"
  | "PRESCRIPTION_ISSUED"
  | "RECORD_SHARED"

/** Looks up the PatientAccountLink for a given clinic-scoped patientId, then
 *  writes a PatientNotification row. Fire-and-forget safe — swallows errors. */
export async function notifyPatient({
  clinicId,
  patientId,
  type,
  title,
  body,
  relatedId,
}: {
  clinicId: string
  patientId: string
  type: NotifType
  title: string
  body: string
  relatedId?: string
}) {
  try {
    const link = await db.patientAccountLink.findUnique({
      where: { patientId },
      select: { patientAccountId: true }
    })
    if (!link) return // no portal account linked yet for this patient

    await db.patientNotification.create({
      data: {
        patientAccountId: link.patientAccountId,
        clinicId,
        type,
        title,
        body,
        relatedId: relatedId ?? null,
      }
    })
  } catch (e) {
    console.error("[patient-notifications] Failed to write notification:", e)
  }
}
