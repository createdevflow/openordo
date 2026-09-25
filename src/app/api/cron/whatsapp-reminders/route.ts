import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hasActivePlugin } from "@/lib/plugins"
import { sendClinicScopedWhatsAppMessage } from "@/lib/whatsapp-send"
import { fmtDateShort, fmtTime12 } from "@/components/DashboardHelpers"

// Runs hourly. Finds appointments in the next 24h and sends reminders if the clinic has the plugin active.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const windowStart = new Date(now)
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now

    // Find all upcoming appointments
    const upcomingAppointments = await db.appointment.findMany({
      where: {
        status: "scheduled",
        date: {
          gte: windowStart,
          lte: windowEnd
        },
        patient: { phone: { notIn: ["", "—"] } }
      },
      include: {
        patient: true,
        doctor: true,
        clinic: true
      }
    })

    if (upcomingAppointments.length === 0) {
      return NextResponse.json({ success: true, processed: 0 })
    }

    // Get IDs of appointments that already have a reminder logged
    const loggedReminders = await db.whatsAppMessageLog.findMany({
      where: {
        appointmentId: { in: upcomingAppointments.map(a => a.id) },
        eventType: "APPOINTMENT_REMINDER",
        status: { not: "FAILED" }
      },
      select: { appointmentId: true }
    })
    const remindedSet = new Set(loggedReminders.map(log => log.appointmentId))

    // Filter to those needing a reminder
    const needingReminder = upcomingAppointments.filter(a => !remindedSet.has(a.id))

    // Group by clinicId to minimize plugin checks
    const clinicIds = [...new Set(needingReminder.map(a => a.clinicId))]
    const clinicPluginStatus = new Map<string, boolean>()
    
    for (const clinicId of clinicIds) {
      const active = await hasActivePlugin(clinicId, "whatsapp-reminders")
      clinicPluginStatus.set(clinicId, active)
    }

    let sentCount = 0

    // Send reminders
    for (const appointment of needingReminder) {
      const isPluginActive = clinicPluginStatus.get(appointment.clinicId)
      if (!isPluginActive) continue

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

      const res = await sendClinicScopedWhatsAppMessage({
        toPhone: p.phone!,
        eventType: "APPOINTMENT_REMINDER",
        variables: vars,
        clinicId: c.id,
        patientId: p.id,
        appointmentId: appointment.id
      })

      if (res.sent) {
        sentCount++
      }
    }

    return NextResponse.json({ success: true, processed: sentCount })
  } catch (error: any) {
    console.error("CRON Error (whatsapp-reminders):", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
