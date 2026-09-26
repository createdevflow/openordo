"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import {
  requestPatientLoginCodeAction,
  verifyPatientLoginCodeAction,
  loginPatientWithPasswordAction,
  setPatientPasswordAction
} from "@/server/actions/patient-portal"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { ArrowRight, KeyRound, Eye, EyeOff, Lock } from "lucide-react"

type Step = "REQUEST" | "HAS_PASSWORD" | "VERIFY_CODE" | "SET_PASSWORD"

export function PatientLoginClient({
  clinicId,
  slug,
  accentColor
}: {
  clinicId: string
  slug: string
  accentColor: string
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("REQUEST")
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  function btnStyle(disabled?: boolean) {
    return {
      backgroundColor: disabled ? undefined : accentColor,
      opacity: disabled ? 0.6 : 1
    }
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    const res = await requestPatientLoginCodeAction(identifier)
    if ("error" in res && res.error) {
      setError(res.error)
    } else if ("success" in res && res.success) {
      if (res.hasPassword) {
        setStep("HAS_PASSWORD")
      } else {
        setStep("VERIFY_CODE")
        if (res.dummyCode) {
          setMessage(`Demo mode — your code is: ${res.dummyCode}`)
        } else {
          setMessage("A login code has been sent to your registered email.")
        }
      }
    }
    setLoading(false)
  }

  async function handleCodeLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    // When on the HAS_PASSWORD step, patient clicked "use a code instead"
    const res = await requestPatientLoginCodeAction(identifier)
    if ("error" in res && res.error) {
      setError(res.error)
    } else {
      setStep("VERIFY_CODE")
      const r = res as any
      if (r.dummyCode) {
        setMessage(`Demo mode — your code is: ${r.dummyCode}`)
      } else {
        setMessage("A login code has been sent to your registered email.")
      }
    }
    setLoading(false)
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await loginPatientWithPasswordAction(identifier, password)
    if ("error" in res && res.error) {
      setError(res.error)
      setLoading(false)
    } else if ("success" in res && res.success) {
      const r = res as any
      const clinics: { slug: string }[] = r.clinics || []
      const thisClinic = clinics.find(c => c.slug === slug)
      if (thisClinic) {
        router.push(`/portal/${slug}`)
        router.refresh()
      } else if (clinics.length === 1) {
        router.push(`/portal/${clinics[0].slug}`)
      } else {
        router.push(`/login`)
      }
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await verifyPatientLoginCodeAction(identifier, otp)
    if ("error" in res && res.error) {
      setError(res.error)
      setLoading(false)
    } else if ("success" in res && res.success) {
      const r = res as any
      if (r.needsPassword) {
        setStep("SET_PASSWORD")
        setMessage("")
      } else {
        const clinics: { slug: string }[] = r.clinics || []
        const thisClinic = clinics.find(c => c.slug === slug)
        if (thisClinic) {
          router.push(`/portal/${slug}`)
        } else if (clinics.length === 1) {
          router.push(`/portal/${clinics[0].slug}`)
        } else {
          router.push(`/login`)
        }
        router.refresh()
      }
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await setPatientPasswordAction(newPassword, confirmPassword)
    if ("error" in res && res.error) {
      setError(res.error)
      setLoading(false)
    } else if ("success" in res && res.success) {
      const r = res as any
      const clinics: { slug: string }[] = r.clinics || []
      const thisClinic = clinics.find(c => c.slug === slug)
      if (thisClinic) {
        router.push(`/portal/${slug}`)
      } else if (clinics.length === 1) {
        router.push(`/portal/${clinics[0].slug}`)
      } else {
        router.push(`/login`)
      }
      router.refresh()
    }
  }

  return (
    <div>
      {error && (
        <div className="bg-coral-soft text-coral p-3 rounded-lg text-sm mb-4 border border-coral/20">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-forest-soft text-forest p-3 rounded-lg text-sm mb-4 border border-forest/20">
          {message}
        </div>
      )}

      {step === "REQUEST" && (
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
            style={btnStyle(loading)}
            disabled={loading}
          >
            {loading ? "Checking..." : "Continue"}
            {!loading && <ArrowRight size={16} className="ml-2" />}
          </Button>
        </form>
      )}

      {step === "HAS_PASSWORD" && (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <p className="text-sm text-ink-soft">Enter your password to sign in.</p>
          <div className="relative">
            <Input
              required
              type={showPassword ? "text" : "password"}
              placeholder="Your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Button
            type="submit"
            className="w-full justify-center h-11 text-white"
            style={btnStyle(loading)}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
            {!loading && <KeyRound size={16} className="ml-2" />}
          </Button>
          <div className="flex gap-4 text-sm text-center justify-between mt-2">
            <button
              type="button"
              onClick={() => { setStep("REQUEST"); setError(""); setPassword("") }}
              className="text-ink-soft hover:text-ink hover:underline"
            >
              ← Use different email
            </button>
            <button
              type="button"
              onClick={handleCodeLogin}
              disabled={loading}
              className="text-forest hover:underline font-medium"
            >
              Use a login code instead
            </button>
          </div>
        </form>
      )}

      {step === "VERIFY_CODE" && (
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Enter 6-digit Code</label>
            <Input
              required
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
              disabled={loading}
              autoFocus
              className="text-center text-xl tracking-[0.5em] font-mono"
              maxLength={6}
            />
          </div>
          <Button
            type="submit"
            className="w-full justify-center h-11 text-white"
            style={btnStyle(loading || otp.length < 6)}
            disabled={loading || otp.length < 6}
          >
            {loading ? "Verifying..." : "Sign In"}
            {!loading && <KeyRound size={16} className="ml-2" />}
          </Button>
          <div className="text-center mt-4 space-y-2">
            <button
              type="button"
              onClick={() => { setStep("REQUEST"); setOtp(""); setError(""); setMessage("") }}
              className="text-sm text-ink-soft hover:text-ink hover:underline block w-full"
            >
              Use a different email or phone
            </button>
            <button
              type="button"
              onClick={handleRequest}
              disabled={loading}
              className="text-sm text-forest hover:underline block w-full"
            >
              Resend code
            </button>
          </div>
        </form>
      )}

      {step === "SET_PASSWORD" && (
        <form onSubmit={handleSetPassword} className="space-y-4">
          <div className="text-center mb-2">
            <Lock size={32} className="mx-auto mb-2 text-forest" style={{ color: accentColor }} />
            <h3 className="font-semibold text-ink">Set your account password</h3>
            <p className="text-sm text-ink-soft mt-1">
              Create a password to sign in quickly next time. You can always use a login code instead.
            </p>
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-ink mb-1">New Password</label>
            <Input
              required
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              disabled={loading}
              autoFocus
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-[34px] text-ink-soft"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Confirm Password</label>
            <Input
              required
              type={showPassword ? "text" : "password"}
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button
            type="submit"
            className="w-full justify-center h-11 text-white"
            style={btnStyle(loading)}
            disabled={loading}
          >
            {loading ? "Saving..." : "Set Password & Continue"}
            {!loading && <ArrowRight size={16} className="ml-2" />}
          </Button>
        </form>
      )}
    </div>
  )
}
