"use server"

import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"

export async function createInvoiceAction(data: {
  patientId: string
  date: string
  items: { desc: string, amount: number }[]
  documentUrl?: string
  documentSize?: number
  documentName?: string
}) {
  const clinicId = await requireClinicId()

  const count = await db.invoice.count({ where: { clinicId } })
  const displayId = "INV-" + (2200 + count + Math.floor(Math.random() * 90))

  const invoice = await db.invoice.create({
    data: {
      clinicId,
      patientId: data.patientId,
      displayId,
      date: new Date(data.date),
      items: JSON.stringify(data.items),
      status: "unpaid"
    }
  })

  if (data.documentUrl && data.documentSize !== undefined) {
    await db.patientDocument.create({
      data: {
        clinicId,
        patientId: data.patientId,
        name: data.documentName || `Invoice ${displayId}`,
        type: "INVOICE",
        sizeBytes: data.documentSize,
        url: data.documentUrl
      }
    })
  }

  revalidatePath("/dashboard/billing")
  revalidatePath("/dashboard/patients")
  revalidatePath("/dashboard")
  return invoice
}

export async function markInvoicePaidAction(id: string) {
  const clinicId = await requireClinicId()

  const invoice = await db.invoice.update({
    where: { id, clinicId },
    data: { status: "paid" }
  })

  revalidatePath("/dashboard/billing")
  revalidatePath("/dashboard/patients")
  revalidatePath("/dashboard")
  return invoice
}
