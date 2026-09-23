"use client"

import { useState } from "react"
import { approveDeletionRequest, rejectDeletionRequest } from "@/server/actions/admin/deletion-requests"

export default function ActionButtons({ requestId, hasUser }: { requestId: string, hasUser: boolean }) {
  const [isPending, setIsPending] = useState(false)

  async function handleApprove() {
    if (!confirm(hasUser ? "This will soft-delete the user's account and all their clinics. Are you sure?" : "No account found. Just approve the request?")) return
    setIsPending(true)
    await approveDeletionRequest(requestId)
    setIsPending(false)
  }

  async function handleReject() {
    if (!confirm("Are you sure you want to reject this request?")) return
    setIsPending(true)
    await rejectDeletionRequest(requestId)
    setIsPending(false)
  }

  return (
    <div className="flex gap-2 justify-end">
      <button
        onClick={handleApprove}
        disabled={isPending}
        className="text-green-600 hover:text-green-900 disabled:opacity-50 text-sm font-medium"
      >
        Approve
      </button>
      <button
        onClick={handleReject}
        disabled={isPending}
        className="text-red-600 hover:text-red-900 disabled:opacity-50 text-sm font-medium"
      >
        Reject
      </button>
    </div>
  )
}
