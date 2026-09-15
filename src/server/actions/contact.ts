"use server"

import { db } from "@/lib/db"

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

    // TODO: Send email notification to Admin

    return { success: true }
  } catch (err) {
    console.error("Failed to submit lead", err)
    return { error: "Failed to submit. Please try again later." }
  }
}
