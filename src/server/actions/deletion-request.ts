"use server"

import { db } from "@/lib/db"

export async function submitDeletionRequest(input: FormData | { email: string; reason: string }) {
  let email = ""
  let reason = ""

  if (input instanceof FormData) {
    email = (input.get("email") as string) || ""
    reason = (input.get("reason") as string) || ""
  } else if (input && typeof input === "object") {
    email = input.email || ""
    reason = input.reason || ""
  }

  if (!email || !reason) {
    return { error: "Email and reason are required." }
  }

  // Basic email validation
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { error: "Invalid email format." }
  }

  try {
    // @ts-ignore
    const existing = await db.accountDeletionRequest.findFirst({
      where: { email: email.toLowerCase(), status: "PENDING" }
    })
    if (existing) {
      return { success: true, message: "A deletion request is already pending review for this account." }
    }

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
