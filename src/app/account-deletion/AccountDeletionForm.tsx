"use client"

import { useState } from "react"
import { submitDeletionRequest } from "@/server/actions/deletion-request"

export default function AccountDeletionForm() {
  const [isPending, setIsPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await submitDeletionRequest(formData)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }

    setIsPending(false)
  }

  if (success) {
    return (
      <div className="rounded-md bg-green-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Request Submitted Successfully</h3>
            <div className="mt-2 text-sm text-green-700">
              <p>
                Your account deletion request has been received. Our team will review it and you will receive an email once your account has been scheduled for deletion.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">{error}</h3>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-[14.5px] font-medium text-ink">
          Account Email Address
        </label>
        <div className="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="appearance-none block w-full px-3 py-2 border border-line rounded-[7px] bg-paper-raised placeholder-moss focus:outline-none focus:ring-forest focus:border-forest sm:text-[14.5px] text-ink"
          />
        </div>
      </div>

      <div>
        <label htmlFor="reason" className="block text-[14.5px] font-medium text-ink">
          Reason for Deletion
        </label>
        <div className="mt-1">
          <select
            id="reason"
            name="reason"
            required
            className="block w-full pl-3 pr-10 py-2 border border-line focus:outline-none focus:ring-forest focus:border-forest sm:text-[14.5px] rounded-[7px] text-ink bg-paper-raised"
          >
            <option value="">Select a reason</option>
            <option value="No longer need the service">No longer need the service</option>
            <option value="Privacy concerns">Privacy concerns</option>
            <option value="Too expensive">Too expensive</option>
            <option value="Switching to a competitor">Switching to a competitor</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-[7px] text-[14.5px] font-medium text-white bg-forest hover:bg-forest-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forest disabled:opacity-50 transition-colors"
        >
          {isPending ? "Submitting..." : "Submit Deletion Request"}
        </button>
      </div>
    </form>
  )
}
