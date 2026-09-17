"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  clinicId: string
  userId: string
  stripePublishableKey: string
  planName: string
  trialEndsAt: string
}

export function PaymentSetupForm({ clinicId, userId, stripePublishableKey, planName, trialEndsAt }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasStripe = !!stripePublishableKey

  const handleSkip = async () => {
    // Allow skipping payment for now (user can add it later in settings)
    setIsLoading(true)
    try {
      const res = await fetch("/api/stripe/confirm-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, userId, skip: true })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      router.push("/dashboard")
    } catch (e: any) {
      setError(e.message)
      setIsLoading(false)
    }
  }

  const handleConnectStripe = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/stripe/setup-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create setup session")
      if (json.url) {
        window.location.href = json.url
      }
    } catch (e: any) {
      setError(e.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white border border-line rounded-xl overflow-hidden">
      {!hasStripe ? (
        <div className="p-6">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
            <span className="text-amber-600 text-lg leading-none">⚠</span>
            <div>
              <div className="text-[13.5px] font-semibold text-amber-800">Stripe not configured</div>
              <div className="text-[12.5px] text-amber-700 mt-1">
                Add <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_STRIPE_PUBLIC_KEY</code> and{" "}
                <code className="bg-amber-100 px-1 rounded">STRIPE_SECRET_KEY</code> to your .env to enable payment collection.
              </div>
            </div>
          </div>
          <p className="text-[13.5px] text-ink-soft mb-6 text-center">
            Your <strong>{planName}</strong> trial has started. You can continue to the dashboard now and add a payment method later from Settings → Subscription.
          </p>
          <button
            onClick={handleSkip}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-forest text-white rounded-lg font-semibold text-[14px] hover:bg-forest/90 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? "Loading..." : "Continue to Dashboard →"}
          </button>
        </div>
      ) : (
        <div className="p-6">
          <p className="text-[13.5px] text-ink-soft mb-6 text-center">
            Securely add your card. Your <strong>{planName}</strong> trial is free — you will only be charged automatically after the trial ends.
          </p>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[13px] mb-4">
              {error}
            </div>
          )}
          <button
            onClick={handleConnectStripe}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-forest text-white rounded-lg font-semibold text-[14px] hover:bg-forest/90 transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? "Redirecting to Stripe..." : "Add Payment Method →"}
          </button>
          <button
            onClick={handleSkip}
            disabled={isLoading}
            className="w-full mt-3 py-2 px-4 text-ink-soft text-[13px] hover:text-ink transition-colors cursor-pointer"
          >
            Skip for now, add later
          </button>
        </div>
      )}
    </div>
  )
}
