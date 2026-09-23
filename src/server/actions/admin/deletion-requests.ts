"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function approveDeletionRequest(requestId: string) {
  const session = await auth()
  if (session?.user?.platformRole !== "SUPER_ADMIN") {
    return { error: "Unauthorized" }
  }

  try {
    // @ts-ignore
    const request = await db.accountDeletionRequest.findUnique({
      where: { id: requestId },
    })

    if (!request) {
      return { error: "Request not found." }
    }

    if (request.status !== "PENDING") {
      return { error: "Request has already been processed." }
    }

    // Find associated user
    const user = await db.user.findFirst({
      where: { email: request.email },
    })

    if (user) {
      // Soft delete the user
      await db.user.update({
        where: { id: user.id },
        data: {
          status: "SOFT_DELETED",
          deletedAt: new Date(),
        },
      })
    }

    // Update request status
    // @ts-ignore
    await db.accountDeletionRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED" },
    })

    revalidatePath("/admin/deletion-requests")
    return { success: true }
  } catch (error) {
    console.error("Failed to approve deletion request:", error)
    return { error: "An error occurred while processing the request." }
  }
}

export async function rejectDeletionRequest(requestId: string) {
  const session = await auth()
  if (session?.user?.platformRole !== "SUPER_ADMIN") {
    return { error: "Unauthorized" }
  }

  try {
    // @ts-ignore
    await db.accountDeletionRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    })

    revalidatePath("/admin/deletion-requests")
    return { success: true }
  } catch (error) {
    console.error("Failed to reject deletion request:", error)
    return { error: "An error occurred while processing the request." }
  }
}
