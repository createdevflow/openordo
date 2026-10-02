"use server"

import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { canAddPatient } from "@/lib/features"
import { hasActivePlugin } from "@/lib/plugins"
import { sendClinicScopedWhatsAppMessage } from "@/lib/whatsapp-send"
import { fmtDateShort, fmtTime12 } from "@/components/DashboardHelpers"
import { notifyPatient } from "@/lib/patient-notifications"
import { sendNotificationEmail } from "@/lib/notifications/send"
import { Routes } from "@/lib/routes"
import { renderAppointmentConfirmed, renderAppointmentChangedByClinic, renderNewBookingReceived } from "@/lib/notifications/templates"

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
    },
    include: {
      patient: true,
      doctor: true,
      clinic: true
    }
  })

  // Send WhatsApp confirmation fire-and-forget
  if (appointment.patient.phone && appointment.patient.phone !== "—") {
    hasActivePlugin(clinicId, "whatsapp-reminders").then(async (isActive) => {
      const p = appointment.patient
      const d = appointment.doctor
      const c = appointment.clinic
      
      const vars = {
        clinic_name: c.name,
        clinic_address: c.address || "the clinic",
        clinic_phone: c.phone || "our front desk",
        patient_name: p.name,
        doctor_name: `Dr. ${d.name}`,
        date: fmtDateShort(appointment.date.toISOString().split("T")[0]),
        time: fmtTime12(appointment.time),
      }

      if (isActive) {
        await sendClinicScopedWhatsAppMessage({
          toPhone: p.phone!,
          eventType: "APPOINTMENT_CONFIRMATION",
          variables: vars,
          clinicId,
          patientId: p.id,
          appointmentId: appointment.id
        })
      } else {
        const commSettings = await db.platformCommunicationSettings.findFirst()
        if (commSettings?.appointmentConfirmationFallbackChannel === "SMS") {
          const { sendSms } = await import("@/lib/sms")
          await sendSms({
            toPhone: p.phone!,
            eventType: "APPOINTMENT_CONFIRMATION",
            variables: vars,
            clinicId,
            patientId: p.id,
            appointmentId: appointment.id
          })
        }
      }
    }).catch(console.error)
  }

  // Patient portal: notify patient of new appointment
  notifyPatient({
    clinicId,
    patientId: appointment.patient.id,
    type: "APPOINTMENT_CONFIRMED",
    title: "Appointment confirmed",
    body: `Your appointment with Dr. ${appointment.doctor.name} on ${fmtDateShort(appointment.date.toISOString().split("T")[0])} at ${fmtTime12(appointment.time)} has been scheduled.`,
    relatedId: appointment.id
  }).catch(console.error)

  // Email: APPOINTMENT_CONFIRMED to patient (if they have a PatientAccount with an email)
  const patientEmail = appointment.patient.email
  if (patientEmail) {
    const APP = process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"
    const patientAccount = await db.patientAccount.findFirst({ where: { email: patientEmail } })
    sendNotificationEmail(
      "APPOINTMENT_CONFIRMED",
      { toEmail: patientEmail, ownerType: "PATIENT_ACCOUNT", ownerId: patientAccount?.id || null, clinicId },
      renderAppointmentConfirmed({
        patientName: appointment.patient.name,
        clinicName: appointment.clinic.name,
        date: fmtDateShort(appointment.date.toISOString().split("T")[0]),
        time: fmtTime12(appointment.time),
        doctorName: `Dr. ${appointment.doctor.name}`,
        loginUrl: `${APP}${Routes.PatientPortalForClinic(appointment.clinic.slug)}`,
        preferencesUrl: `${APP}${Routes.PatientPortalSettingsForClinic(appointment.clinic.slug)}`,
      })
    ).catch(console.error)
  }

  // Email: NEW_BOOKING_RECEIVED for clinic staff (toggleable)
  const clinicOwners = await db.membership.findMany({
    where: { clinicId, role: "OWNER" },
    include: { user: { select: { id: true, email: true, name: true } } }
  })
  for (const m of clinicOwners) {
    if (!m.user.email) continue
    const APP = process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"
    sendNotificationEmail(
      "NEW_BOOKING_RECEIVED",
      { toEmail: m.user.email, ownerType: "USER", ownerId: m.user.id, clinicId },
      renderNewBookingReceived({
        clinicName: appointment.clinic.name,
        patientName: appointment.patient.name,
        date: fmtDateShort(appointment.date.toISOString().split("T")[0]),
        time: fmtTime12(appointment.time),
        reason: appointment.reason,
        dashboardUrl: `${APP}/dashboard/appointments`,
      })
    ).catch(console.error)
  }

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
    },
    include: {
      patient: true,
      doctor: true,
      clinic: true
    }
  })

  // Send WhatsApp rescheduled if date/time was modified
  if ((data.date || data.time) && appointment.patient.phone && appointment.patient.phone !== "—") {
    hasActivePlugin(clinicId, "whatsapp-reminders").then(async (isActive) => {
      if (!isActive) return
      const p = appointment.patient
      const d = appointment.doctor
      const c = appointment.clinic
      const vars = {
        clinic_name: c.name,
        patient_name: p.name,
        doctor_name: `Dr. ${d.name}`,
        date: fmtDateShort(appointment.date.toISOString().split("T")[0]),
        time: fmtTime12(appointment.time),
      }
      await sendClinicScopedWhatsAppMessage({
        toPhone: p.phone!,
        eventType: "APPOINTMENT_CANCELLED", // using this template for reschedule as per spec vars
        variables: vars,
        clinicId,
        patientId: p.id,
        appointmentId: appointment.id
      })
    }).catch(console.error)
  }

  // Patient portal: notify patient of appointment update
  if (data.date || data.time) {
    notifyPatient({
      clinicId,
      patientId: appointment.patient.id,
      type: "APPOINTMENT_UPDATED",
      title: "Appointment rescheduled",
      body: `Your appointment with Dr. ${appointment.doctor.name} has been rescheduled to ${fmtDateShort(appointment.date.toISOString().split("T")[0])} at ${fmtTime12(appointment.time)}.`,
      relatedId: appointment.id
    }).catch(console.error)

    // Email: APPOINTMENT_CHANGED_BY_CLINIC for patient
    const patientEmail = appointment.patient.email
    if (patientEmail) {
      const APP = process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"
      const patientAccount = await db.patientAccount.findFirst({ where: { email: patientEmail } })
      sendNotificationEmail(
        "APPOINTMENT_CHANGED_BY_CLINIC",
        { toEmail: patientEmail, ownerType: "PATIENT_ACCOUNT", ownerId: patientAccount?.id || null, clinicId },
        renderAppointmentChangedByClinic({
          patientName: appointment.patient.name,
          clinicName: appointment.clinic.name,
          changeType: "rescheduled",
          newDate: fmtDateShort(appointment.date.toISOString().split("T")[0]),
          newTime: fmtTime12(appointment.time),
          loginUrl: `${APP}/patient-portal`,
          preferencesUrl: `${APP}/patient-portal/settings`,
        })
      ).catch(console.error)
    }
  }

  revalidatePath("/dashboard", "layout")
  return appointment
}

export async function updateAppointmentStatusAction(id: string, status: string) {
  const clinicId = await requireClinicId()

  const appointment = await db.appointment.update({
    where: { id, clinicId },
    data: { status },
    include: {
      patient: true,
      doctor: true,
      clinic: true
    }
  })

  // Send WhatsApp cancellation
  if (status === "cancelled" && appointment.patient.phone && appointment.patient.phone !== "—") {
    hasActivePlugin(clinicId, "whatsapp-reminders").then(async (isActive) => {
      if (!isActive) return
      const p = appointment.patient
      const d = appointment.doctor
      const c = appointment.clinic
      const vars = {
        clinic_name: c.name,
        patient_name: p.name,
        doctor_name: `Dr. ${d.name}`,
        date: fmtDateShort(appointment.date.toISOString().split("T")[0]),
        time: fmtTime12(appointment.time),
      }
      await sendClinicScopedWhatsAppMessage({
        toPhone: p.phone!,
        eventType: "APPOINTMENT_CANCELLED",
        variables: vars,
        clinicId,
        patientId: p.id,
        appointmentId: appointment.id
      })
    }).catch(console.error)
  }

  revalidatePath("/dashboard", "layout")
  return appointment
}
