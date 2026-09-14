"use server"

import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { canAddDoctor } from "@/lib/features"

export async function createDoctorAction(data: {
  name: string
  specialty: string
  phone: string
  email: string
  workingDays: string[]
}) {
  const clinicId = await requireClinicId()

  const check = await canAddDoctor(clinicId)
  if (!check.allowed) {
    throw new Error(check.message || "Doctor limit reached for your plan.")
  }

  const doctor = await db.doctor.create({
    data: {
      name: data.name,
      specialty: data.specialty,
      phone: data.phone,
      email: data.email,
      workingDays: JSON.stringify(data.workingDays),
      clinicId,
    }
  })

  revalidatePath("/dashboard/doctors")
  revalidatePath("/dashboard/patients")
  revalidatePath("/dashboard/appointments")
  return doctor
}

export async function updateDoctorAction(id: string, data: {
  name: string
  specialty: string
  phone: string
  email: string
  workingDays: string[]
}) {
  const clinicId = await requireClinicId()

  const doctor = await db.doctor.update({
    where: { id, clinicId },
    data: {
      name: data.name,
      specialty: data.specialty,
      phone: data.phone,
      email: data.email,
      workingDays: JSON.stringify(data.workingDays),
    }
  })

  revalidatePath("/dashboard/doctors")
  revalidatePath("/dashboard/patients")
  revalidatePath("/dashboard/appointments")
  return doctor
}

export async function deleteDoctorAction(id: string) {
  const clinicId = await requireClinicId()

  await db.doctor.delete({
    where: { id, clinicId }
  })

  revalidatePath("/dashboard/doctors")
  revalidatePath("/dashboard/patients")
  revalidatePath("/dashboard/appointments")
  return true
}
