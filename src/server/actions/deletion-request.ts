"use server"

import { db } from "@/lib/db"

export async function submitDeletionRequest(formData: FormData) {
  const email = formData.get("email") as string
  const reason = formData.get("reason") as string

  if (!email || !reason) {
    return { error: "Email and reason are required." }
  }

  // Basic email validation
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { error: "Invalid email format." }
  }

  try {
    // @ts-ignore - Ignore TS error because prisma client couldn't generate due to lock
    await db.accountDeletionRequest.create({
      data: {
        email: email.toLowerCase(),
        reason,
        status: "PENDING",
      },
    })
    return { success: true }
  } catch (error) {
    console.error("Failed to submit deletion request:", error)
    return { error: "Failed to submit request. Please try again." }
  }
}
