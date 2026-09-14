"use server"

import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { canAddPatient } from "@/lib/features"

export async function createAppointmentAction(data: {
  patientId?: string
  doctorId: string
  date: string
  time: string
  duration: number
  reason: string
  visitType?: "IN_PERSON" | "VIDEO"
  newPatient?: {
    name: string
    phone: string
    age?: number
    gender?: string
    email?: string
  }
}) {
  const clinicId = await requireClinicId()

  let finalPatientId = data.patientId

  // If newPatient details are provided, register the patient directly
  if (data.newPatient && data.newPatient.name?.trim()) {
    const check = await canAddPatient(clinicId)
    if (!check.allowed) {
      throw new Error(check.message || "Patient limit reached for your plan.")
    }

    const count = await db.patient.count({ where: { clinicId } })
    const displayId = "P-" + (1000 + count + Math.floor(Math.random() * 90))
    const colors = ["#1E4638", "#386A8A", "#C8862B", "#B5432F", "#5C7A67"]
    const colorTag = colors[count % 5]

    const createdPatient = await db.patient.create({
      data: {
        clinicId,
        name: data.newPatient.name.trim(),
        phone: data.newPatient.phone?.trim() || "—",
        age: Number(data.newPatient.age) || 30,
        gender: data.newPatient.gender || "Female",
        email: data.newPatient.email?.trim() || "",
        displayId,
        colorTag
      }
    })
    finalPatientId = createdPatient.id
  }

  if (!finalPatientId) {
    throw new Error("A patient must be selected or entered.")
  }

  const visitType = data.visitType || "IN_PERSON"
  const roomId = visitType === "VIDEO" 
    ? "room-" + Math.random().toString(36).substring(2, 8) + "-" + Date.now().toString(36)
    : null

  const appointment = await db.appointment.create({
    data: {
      patientId: finalPatientId,
      doctorId: data.doctorId,
      date: new Date(data.date),
      time: data.time,
      duration: data.duration,
      reason: data.reason,
      clinicId,
      status: "scheduled",
      visitType,
      roomId
    }
  })

  revalidatePath("/dashboard", "layout")
  return appointment
}

export async function updateAppointmentAction(id: string, data: {
  patientId?: string
  doctorId?: string
  date?: string
  time?: string
  duration?: number
  reason?: string
}) {
  const clinicId = await requireClinicId()

  const appointment = await db.appointment.update({
    where: { id, clinicId },
    data: {
      ...data,
      ...(data.date ? { date: new Date(data.date) } : {})
    }
  })

  revalidatePath("/dashboard", "layout")
  return appointment
}

export async function updateAppointmentStatusAction(id: string, status: string) {
  const clinicId = await requireClinicId()

  const appointment = await db.appointment.update({
    where: { id, clinicId },
    data: { status }
  })

  revalidatePath("/dashboard", "layout")
  return appointment
}
