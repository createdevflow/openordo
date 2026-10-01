"use server"

/**
 * Feedback widget server action — CHARTWELL_PRELAUNCH_OPS_SPEC.md §4
 *
 * Submits in-app feedback to the existing ContactLead model, tagged
 * with source="IN_APP_FEEDBACK" and reason="Technical support" (or the
 * value the user selects), so it surfaces in /admin/leads.
 */

import { db } from "@/lib/db"
import { sendNotificationEmail } from "@/lib/notifications/send"
import { renderNewLead } from "@/lib/notifications/templates"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"

export interface SubmitFeedbackInput {
  message: string
  reason: string
  pageUrl: string
  userAgent: string
  clinicId?: string
}

export async function submitFeedback(input: SubmitFeedbackInput): Promise<{ success: boolean; error?: string }> {
  const { message, reason, pageUrl, userAgent, clinicId } = input

  if (!message?.trim()) {
    return { success: false, error: "Message is required." }
  }

  // Get the logged-in user's name/email for the lead record
  const session = await auth()
  const userName = session?.user?.name || "Anonymous"
  const userEmail = session?.user?.email || "noreply@openordo.com"

  const metadata = JSON.stringify({
    pageUrl,
    userAgent: userAgent?.slice(0, 300), // cap length
    clinicId: clinicId || null,
  })

  try {
    const lead = await db.contactLead.create({
      data: {
        name: userName,
        email: userEmail,
        message: message.trim(),
        reason,
        source: "IN_APP_FEEDBACK",
        metadata,
        status: "NEW",
      },
    })

    logger.info("In-app feedback submitted", { leadId: lead.id, reason, clinicId })

    // Notify admin (fire-and-forget)
    const adminEmail = process.env.ADMIN_ALERT_EMAIL
    if (adminEmail) {
      const APP = process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"
      sendNotificationEmail(
        "NEW_LEAD",
        { toEmail: adminEmail, ownerType: "ADMIN" },
        renderNewLead({
          name: `${userName} [In-App Feedback]`,
          email: userEmail,
          message: `Reason: ${reason}\nPage: ${pageUrl}\n\n${message}`,
          adminUrl: `${APP}/admin/leads`,
        })
      ).catch(console.error)
    }

    return { success: true }
  } catch (err) {
    logger.error("Failed to submit feedback", err)
    return { success: false, error: "Failed to submit. Please try again." }
  }
}
