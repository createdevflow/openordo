"use server"

import { db } from "@/lib/db"
import { requireClinicId, requireUser } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { hasFeature } from "@/lib/features"

export async function updateClinicSettingsAction(data: {
  name: string
  type: string
  phone: string
  address: string
  openTime: string
  closeTime: string
}) {
  const clinicId = await requireClinicId()

  const clinic = await db.clinic.update({
    where: { id: clinicId },
    data
  })

  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard")
  return clinic
}

export async function updateBillingSettingsAction(data: {
  country: string
  billingConfig: Record<string, string>
}) {
  const clinicId = await requireClinicId()

  const clinic = await db.clinic.update({
    where: { id: clinicId },
    data: {
      country: data.country,
      billingConfig: JSON.stringify(data.billingConfig)
    }
  })

  revalidatePath("/dashboard/settings")
  return clinic
}

export async function updateUserSettingsAction(data: {
  name: string
  email: string
  password?: string
  notificationPrefs?: Record<string, boolean>
}) {
  const user = await requireUser()

  const updateData: any = {
    name: data.name,
    email: data.email
  }
  
  if (data.password) {
    const bcrypt = await import('bcryptjs')
    updateData.passwordHash = await bcrypt.hash(data.password, 10)
  }

  if (data.notificationPrefs) {
    updateData.notificationPrefs = JSON.stringify(data.notificationPrefs)
  }

  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: updateData
  })

  revalidatePath("/dashboard/settings")
  return updatedUser
}

export async function generateApiKeyAction() {
  const clinicId = await requireClinicId()
  
  const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
  if (!clinic) throw new Error("Clinic not found")

  let config: any = {}
  try { config = JSON.parse(clinic.billingConfig || "{}") } catch(e) {}

  // Generate a random API key
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const apiKey = "cw_" + Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 40)

  config.apiKey = apiKey

  await db.clinic.update({
    where: { id: clinicId },
    data: { billingConfig: JSON.stringify(config) }
  })

  revalidatePath("/dashboard/settings")
  return { apiKey }
}

export async function deleteApiKeyAction() {
  const clinicId = await requireClinicId()
  
  const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
  if (!clinic) throw new Error("Clinic not found")

  let config: any = {}
  try { config = JSON.parse(clinic.billingConfig || "{}") } catch(e) {}

  delete config.apiKey

  await db.clinic.update({
    where: { id: clinicId },
    data: { billingConfig: JSON.stringify(config) }
  })

  revalidatePath("/dashboard/settings")
  return { success: true }
}

export async function changeClinicPlanAction(targetPlanId: string) {
  const clinicId = await requireClinicId()
  const targetPlan = await db.plan.findUnique({ where: { id: targetPlanId } })
  if (!targetPlan) throw new Error("Plan not found")

  await db.subscription.upsert({
    where: { clinicId },
    update: { planId: targetPlan.id, status: "ACTIVE" },
    create: {
      clinicId,
      planId: targetPlan.id,
      status: "ACTIVE"
    }
  })

  revalidatePath("/dashboard", "layout")
  return true
}

function toCSV(headers: string[], rows: any[][]): string {
  const escape = (val: any) => {
    if (val === null || val === undefined) return '""'
    const str = String(val)
    return `"${str.replace(/"/g, '""')}"`
  }
  return [
    headers.map(escape).join(","),
    ...rows.map(r => r.map(escape).join(","))
  ].join("\r\n")
}

export async function exportClinicDataAction(filter?: {
  range?: "all" | "1m" | "3m" | "6m" | "1y" | "custom"
  startDate?: string
  endDate?: string
}) {
  const clinicId = await requireClinicId()
  const hasAccess = await hasFeature(clinicId, "support.data_export")
  if (!hasAccess) {
    throw new Error("Data export is only available on the Clinic Group plan.")
  }

  const range = filter?.range || "all"
  let start: Date | null = null
  let end: Date | null = null
  const now = new Date()

  if (range === "1m") {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    end = now
  } else if (range === "3m") {
    start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    end = now
  } else if (range === "6m") {
    start = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
    end = now
  } else if (range === "1y") {
    start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    end = now
  } else if (range === "custom" && filter?.startDate) {
    start = new Date(filter.startDate + "T00:00:00")
    end = filter.endDate ? new Date(filter.endDate + "T23:59:59.999") : now
  }

  const patientWhere: any = { clinicId }
  const appointmentWhere: any = { clinicId }
  const invoiceWhere: any = { clinicId }

  if (start) {
    patientWhere.createdAt = { gte: start, ...(end ? { lte: end } : {}) }
    appointmentWhere.date = { gte: start, ...(end ? { lte: end } : {}) }
    invoiceWhere.date = { gte: start, ...(end ? { lte: end } : {}) }
  }

  const [clinic, patients, appointments, invoices, documentCount] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId } }),
    db.patient.findMany({ where: patientWhere, orderBy: { createdAt: "desc" } }),
    db.appointment.findMany({ 
      where: appointmentWhere, 
      include: { patient: { select: { name: true } }, doctor: { select: { name: true } } },
      orderBy: { date: "desc" } 
    }),
    db.invoice.findMany({ 
      where: invoiceWhere, 
      include: { patient: { select: { name: true } } },
      orderBy: { date: "desc" } 
    }),
    db.patientDocument.count({ where: patientWhere })
  ])

  // 1. Patients CSV
  const patientsHeaders = ["Patient ID", "Display ID", "Full Name", "Age", "Gender", "Phone", "Email", "Address", "Blood Group", "Allergies", "Condition", "Joined Date"]
  const patientsRows = patients.map(p => [
    p.id,
    p.displayId,
    p.name,
    p.age,
    p.gender,
    p.phone,
    p.email || "",
    p.address || "",
    p.bloodGroup || "",
    p.allergies || "",
    p.condition || "",
    p.createdAt.toISOString().split("T")[0]
  ])
  const patientsCSV = toCSV(patientsHeaders, patientsRows)

  // 2. Appointments CSV
  const appointmentsHeaders = ["Appointment ID", "Patient Name", "Doctor Name", "Date", "Time", "Duration (mins)", "Reason", "Status"]
  const appointmentsRows = appointments.map(a => [
    a.id,
    a.patient?.name || "Unknown",
    a.doctor?.name || "Unknown",
    new Date(a.date).toISOString().split("T")[0],
    a.time,
    a.duration,
    a.reason,
    a.status
  ])
  const appointmentsCSV = toCSV(appointmentsHeaders, appointmentsRows)

  // 3. Invoices CSV
  const invoicesHeaders = ["Invoice ID", "Display ID", "Patient Name", "Date", "Items", "Amount", "Status"]
  const invoicesRows = invoices.map(i => {
    let itemsStr = ""
    let total = 0
    try {
      const parsed = typeof i.items === "string" ? JSON.parse(i.items) : i.items || []
      itemsStr = parsed.map((it: any) => `${it.desc} (${it.amount})`).join(" ; ")
      total = parsed.reduce((s: number, it: any) => s + Number(it.amount || 0), 0)
    } catch {
      itemsStr = String(i.items)
    }
    return [
      i.id,
      i.displayId,
      i.patient?.name || "Unknown",
      new Date(i.date).toISOString().split("T")[0],
      itemsStr,
      total,
      i.status
    ]
  })
  const invoicesCSV = toCSV(invoicesHeaders, invoicesRows)

  return {
    clinicSlug: clinic?.slug || "clinic",
    range,
    startDateStr: start ? start.toISOString().split("T")[0] : null,
    endDateStr: end ? end.toISOString().split("T")[0] : null,
    patientsCSV,
    appointmentsCSV,
    invoicesCSV,
    counts: {
      patients: patients.length,
      appointments: appointments.length,
      invoices: invoices.length,
      documents: documentCount
    }
  }
}



export async function cancelSubscriptionAction() {
  const clinicId = await requireClinicId()

  const sub = await db.subscription.findUnique({ where: { clinicId } })
  if (!sub) throw new Error("No subscription found")

  const { getRazorpayKeyId, getRazorpayKeySecret } = await import("@/lib/razorpay-utils")
  const key_id = await getRazorpayKeyId()
  const key_secret = await getRazorpayKeySecret()
  
  if (key_id && key_secret && sub.razorpaySubscriptionId) {
    // Cancel via Razorpay -- cancel at cycle end
    const Razorpay = (await import("razorpay")).default
    const rzp = new Razorpay({ key_id, key_secret })
    
    await rzp.subscriptions.cancel(sub.razorpaySubscriptionId, false)
  }
  
  // Update our DB: mark as pending cancellation at period end
  await db.subscription.update({
    where: { clinicId },
    data: {
      cancelAtPeriodEnd: true,
      // If no Razorpay, set currentPeriodEnd to 30 days from now as a grace period
      currentPeriodEnd: sub.currentPeriodEnd || (() => {
        const d = new Date()
        d.setDate(d.getDate() + 30)
        return d
      })()
    }
  })

  revalidatePath("/dashboard/settings")
  return { ok: true, currentPeriodEnd: sub.currentPeriodEnd }
}
