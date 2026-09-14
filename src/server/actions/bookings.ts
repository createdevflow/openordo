"use server"

import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"

export async function confirmBookingAction(id: string) {
  const clinicId = await requireClinicId()
  
  const req = await db.bookingRequest.findUnique({ where: { id } })
  if (!req || req.clinicId !== clinicId) throw new Error("Not found")
  
  // Find or create the patient
  let patient = await db.patient.findFirst({
    where: { clinicId, email: req.email }
  })

  if (!patient) {
    const count = await db.patient.count({ where: { clinicId } })
    const displayId = `P-${String(count + 1).padStart(4, "0")}`
    patient = await db.patient.create({
      data: {
        clinicId,
        displayId,
        name: req.name,
        email: req.email,
        phone: req.phone,
        age: 0, // will be updated by staff
        gender: "Unknown",
        condition: req.reason
      }
    })
  }

  // Find first available doctor if none specified
  let doctorId = req.doctorId
  if (!doctorId) {
    const doctor = await db.doctor.findFirst({ where: { clinicId } })
    if (doctor) doctorId = doctor.id
  }

  if (doctorId) {
    await db.appointment.create({
      data: {
        clinicId,
        patientId: patient.id,
        doctorId,
        date: new Date(req.date),
        time: req.time,
        duration: 30,
        reason: req.reason,
        status: "SCHEDULED"
      }
    })
  }

  await db.bookingRequest.update({
    where: { id },
    data: { status: "CONFIRMED" }
  })

  revalidatePath("/dashboard", "layout")
}

export async function rejectBookingAction(id: string) {
  const clinicId = await requireClinicId()
  
  const req = await db.bookingRequest.findUnique({ where: { id } })
  if (!req || req.clinicId !== clinicId) throw new Error("Not found")

  await db.bookingRequest.update({
    where: { id },
    data: { status: "REJECTED" }
  })

  revalidatePath("/dashboard/bookings")
}
