"use server"

import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { notifyPatient } from "@/lib/patient-notifications"
import { sendNotificationEmail } from "@/lib/notifications/send"
import { renderInvoiceEvent } from "@/lib/notifications/templates"
import { Routes } from "@/lib/routes"

export async function createInvoiceAction(data: {
  patientId: string
  date: string
  items: { desc: string, amount: number }[]
  documentUrl?: string
  documentSize?: number
  documentName?: string
  includePrescriptionId?: string
}) {
  const clinicId = await requireClinicId()

  const count = await db.invoice.count({ where: { clinicId } })
  const displayId = "INV-" + (2200 + count) + "-" + Math.floor(1000 + Math.random() * 9000)

  // Fetch platform fee percentage from global settings
  const feeSetting = await db.globalSetting.findUnique({ where: { key: "PLATFORM_FEE_PERCENTAGE" } }).catch(() => null)
  const feePercentage = parseFloat(feeSetting?.value || "10")
  
  const processedItems = [...data.items]
  
  if (!isNaN(feePercentage) && feePercentage > 0) {
    const subtotal = processedItems.reduce((sum, item) => sum + item.amount, 0)
    const platformFeeAmount = Number((subtotal * (feePercentage / 100)).toFixed(2))
    if (platformFeeAmount > 0) {
      processedItems.push({
        desc: `Platform Fee (${feePercentage}%)`,
        amount: platformFeeAmount
      })
    }
  }

  const invoice = await db.invoice.create({
    data: {
      clinicId,
      patientId: data.patientId,
      displayId,
      date: new Date(data.date),
      items: JSON.stringify(processedItems),
      status: "unpaid",
      // Persist the prescription link so the browser print template can render it too
      ...(data.includePrescriptionId ? { prescriptionId: data.includePrescriptionId } : {}),
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
  } else {
    // Generate PDF on server
    try {
      const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
      const patient = await db.patient.findUnique({ where: { id: data.patientId } })
      let prescription = null
      let doctor = null
      if (data.includePrescriptionId) {
        prescription = await db.prescription.findUnique({ where: { id: data.includePrescriptionId } })
        if (prescription?.doctorId) {
          doctor = await db.doctor.findUnique({ where: { id: prescription.doctorId } })
        }
      }

      const { generateInvoicePDF } = await import("@/lib/pdf-generator")
      const pdfBuffer = await generateInvoicePDF({ clinic, patient, invoice, prescription, doctor })
      
      const fs = await import("fs/promises")
      const path = await import("path")
      const uploadDir = path.join(process.cwd(), "private_uploads")
      await fs.mkdir(uploadDir, { recursive: true }).catch(() => {})
      
      const filename = `${Date.now()}_${displayId}.pdf`
      await fs.writeFile(path.join(uploadDir, filename), pdfBuffer)
      
      const fileUrl = `/api/files/${filename}`
      const sizeBytes = pdfBuffer.length

      await db.patientDocument.create({
        data: {
          clinicId,
          patientId: data.patientId,
          name: `Invoice ${displayId}`,
          type: "INVOICE",
          sizeBytes: sizeBytes,
          url: fileUrl
        }
      })
    } catch (pdfErr) {
      console.error("Failed to generate PDF on server:", pdfErr)
    }
  }

  // Patient portal: notify patient of new invoice
  notifyPatient({
    clinicId,
    patientId: data.patientId,
    type: "INVOICE_CREATED",
    title: "New invoice created",
    body: `Invoice ${displayId} has been created for your account.`,
    relatedId: invoice.id
  }).catch(console.error)

  // Email: INVOICE_EVENT (created) to patient if they have an account with email
  const patient = await db.patient.findUnique({ where: { id: data.patientId }, include: { clinic: true } })
  if (patient?.email) {
    const APP = process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"
    const patientAccount = await db.patientAccount.findFirst({ where: { email: patient.email } })
    const items: { desc: string; amount: number }[] = (() => {
      try { return JSON.parse(typeof data.items === "string" ? data.items : JSON.stringify(data.items)) } catch { return [] }
    })()
    const total = items.reduce((s, i) => s + Number(i.amount || 0), 0)
    sendNotificationEmail(
      "INVOICE_EVENT",
      { toEmail: patient.email, ownerType: "PATIENT_ACCOUNT", ownerId: patientAccount?.id || null, clinicId },
      renderInvoiceEvent({
        patientName: patient.name,
        clinicName: patient.clinic.name,
        invoiceDisplayId: displayId,
        amount: `${patient.clinic.countryCode === "IN" ? "₹" : "$"}${total.toFixed(2)}`,
        status: "created",
        loginUrl: `${APP}${Routes.PatientPortalForClinic(patient.clinic.slug)}`,
        preferencesUrl: `${APP}${Routes.PatientPortalSettingsForClinic(patient.clinic.slug)}`,
      })
    ).catch(console.error)
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

  // Patient portal: notify patient invoice is paid
  notifyPatient({
    clinicId,
    patientId: invoice.patientId,
    type: "INVOICE_PAID",
    title: "Invoice marked as paid",
    body: `Invoice ${invoice.displayId} has been marked as paid. Thank you!`,
    relatedId: invoice.id
  }).catch(console.error)

  // Email: INVOICE_EVENT (paid) to patient
  const paidPatient = await db.patient.findUnique({ where: { id: invoice.patientId }, include: { clinic: true } })
  if (paidPatient?.email) {
    const APP = process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"
    const patientAccount = await db.patientAccount.findFirst({ where: { email: paidPatient.email } })
    sendNotificationEmail(
      "INVOICE_EVENT",
      { toEmail: paidPatient.email, ownerType: "PATIENT_ACCOUNT", ownerId: patientAccount?.id || null, clinicId },
      renderInvoiceEvent({
        patientName: paidPatient.name,
        clinicName: paidPatient.clinic.name,
        invoiceDisplayId: invoice.displayId,
        amount: "—",
        status: "paid",
        loginUrl: `${APP}${Routes.PatientPortalForClinic(paidPatient.clinic.slug)}`,
        preferencesUrl: `${APP}${Routes.PatientPortalSettingsForClinic(paidPatient.clinic.slug)}`,
      })
    ).catch(console.error)
  }

  revalidatePath("/dashboard/billing")
  revalidatePath("/dashboard/patients")
  revalidatePath("/dashboard")
  return invoice
}

export async function getInvoicePdfUrlAction(displayId: string, patientId: string) {
  const clinicId = await requireClinicId()
  const doc = await db.patientDocument.findFirst({
    where: {
      clinicId,
      patientId,
      type: "INVOICE",
      name: `Invoice ${displayId}`
    },
    orderBy: { createdAt: "desc" }
  })
  return doc?.url || null
}
