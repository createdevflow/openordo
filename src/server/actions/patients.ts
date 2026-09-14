"use server"

import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { canAddPatient } from "@/lib/features"

export async function createPatientAction(data: {
  name: string
  age: number
  gender: string
  phone: string
  email?: string
  address?: string
  bloodGroup?: string
  allergies?: string
  condition?: string
}) {
  const clinicId = await requireClinicId()

  const check = await canAddPatient(clinicId)
  if (!check.allowed) {
    throw new Error(check.message || "Patient limit reached for your plan.")
  }

  const count = await db.patient.count({ where: { clinicId } })
  const displayId = "P-" + (1000 + count + Math.floor(Math.random() * 90))
  const colors = ["#1E4638", "#386A8A", "#C8862B", "#B5432F", "#5C7A67"]
  const colorTag = colors[count % 5]

  const patient = await db.patient.create({
    data: {
      ...data,
      clinicId,
      displayId,
      colorTag
    }
  })

  revalidatePath("/dashboard", "layout")
  return patient
}

export async function updatePatientAction(id: string, data: {
  name: string
  age: number
  gender: string
  phone: string
  email?: string
  address?: string
  bloodGroup?: string
  allergies?: string
  condition?: string
}) {
  const clinicId = await requireClinicId()

  const patient = await db.patient.update({
    where: { id, clinicId },
    data
  })

  revalidatePath("/dashboard", "layout")
  return patient
}

export async function deletePatientAction(id: string) {
  const clinicId = await requireClinicId()

  await db.patient.delete({
    where: { id, clinicId }
  })

  revalidatePath("/dashboard", "layout")
  return true
}
