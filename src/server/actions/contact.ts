"use server"

import { db } from "@/lib/db"
import { sendNotificationEmail } from "@/lib/notifications/send"
import { renderNewLead } from "@/lib/notifications/templates"

export async function submitContactLead(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const message = formData.get("message") as string

  if (!name || !email || !message) {
    return { error: "All fields are required." }
  }

  try {
    const lead = await db.contactLead.create({
      data: {
        name,
        email,
        message,
      },
    })

    // NEW_LEAD admin alert — mandatory, fires to admin inbox
    const adminEmail = process.env.ADMIN_ALERT_EMAIL
    if (adminEmail) {
      const APP = process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"
      sendNotificationEmail(
        "NEW_LEAD",
        { toEmail: adminEmail, ownerType: "ADMIN" },
        renderNewLead({
          name,
          email,
          message,
          adminUrl: `${APP}/admin/leads`,
        })
      ).catch(console.error)
    }

    return { success: true }
  } catch (err) {
    console.error("Failed to submit lead", err)
    return { error: "Failed to submit. Please try again later." }
  }
}
