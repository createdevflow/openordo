"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { requestPatientPortalOtpAction, verifyPatientPortalOtpAction } from "@/server/actions/patient-portal"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { ArrowRight, KeyRound } from "lucide-react"

export function PatientLoginClient({ clinicId, slug, accentColor }: { clinicId: string, slug: string, accentColor: string }) {
  const router = useRouter()
  const [step, setStep] = useState<"REQUEST" | "VERIFY">("REQUEST")
  const [identifier, setIdentifier] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")
    
    const res = await requestPatientPortalOtpAction(clinicId, identifier)
    if (res.error) {
      setError(res.error)
    } else {
      setStep("VERIFY")
      setMessage(`For this demo, your OTP is: ${res.dummyCode}`)
    }
    setLoading(false)
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    const res = await verifyPatientPortalOtpAction(clinicId, identifier, otp)
    if (res.error) {
      setError(res.error)
      setLoading(false)
    } else {
      // Redirect to dashboard
      router.push(`/portal/${slug}`)
      router.refresh()
    }
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4 border border-green-100">
          {message}
        </div>
      )}

      {step === "REQUEST" ? (
        <form onSubmit={handleRequest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Email or Phone Number</label>
            <Input 
              required
              placeholder="e.g. john@example.com or +1 555-0123"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>
          <Button 
            type="submit" 
            className="w-full justify-center h-11 text-white" 
            style={{ backgroundColor: accentColor }}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Login Code"}
            {!loading && <ArrowRight size={16} className="ml-2" />}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Enter 6-digit Code</label>
            <Input 
              required
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              disabled={loading}
              autoFocus
              className="text-center text-xl tracking-[0.5em] font-mono"
              maxLength={6}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full justify-center h-11 text-white" 
            style={{ backgroundColor: accentColor }}
            disabled={loading || otp.length < 6}
          >
            {loading ? "Verifying..." : "Sign In"}
            {!loading && <KeyRound size={16} className="ml-2" />}
          </Button>
          <div className="text-center mt-4">
            <button 
              type="button" 
              onClick={() => { setStep("REQUEST"); setOtp(""); setError(""); setMessage("") }}
              className="text-sm text-ink-soft hover:text-ink hover:underline"
            >
              Use a different email or phone
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
