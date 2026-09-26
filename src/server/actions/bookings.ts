"use server"

import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { ensurePatientAccount } from "@/lib/patient-account"
import { notifyPatient } from "@/lib/patient-notifications"

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

  // Patient portal: create/link PatientAccount (fire-and-forget)
  ensurePatientAccount(clinicId, {
    id: patient.id,
    name: patient.name,
    email: patient.email,
    phone: patient.phone
  }).catch(console.error)

  // Find first available doctor if none specified
  let doctorId = req.doctorId
  if (!doctorId) {
    const doctor = await db.doctor.findFirst({ where: { clinicId } })
    if (doctor) doctorId = doctor.id
  }

  let appointment = null
  if (doctorId) {
    appointment = await db.appointment.create({
      data: {
        clinicId,
        patientId: patient.id,
        doctorId,
        date: new Date(req.date),
        time: req.time,
        duration: 30,
        reason: req.reason,
        status: "SCHEDULED"
      },
      include: { doctor: true }
    })
  }

  await db.bookingRequest.update({
    where: { id },
    data: { status: "CONFIRMED" }
  })

  // Patient portal: notify patient appointment is confirmed
  if (appointment) {
    notifyPatient({
      clinicId,
      patientId: patient.id,
      type: "APPOINTMENT_CONFIRMED",
      title: "Appointment confirmed",
      body: `Your appointment request for ${req.date} at ${req.time} has been confirmed.`,
      relatedId: appointment.id
    }).catch(console.error)
  }

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
