"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { verifyOtpAction, resendOtpAction } from "@/server/actions/otp"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import Link from "next/link"
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"

export default function VerifyOtpPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const emailParam = searchParams.get("email") || ""

  const [state, formAction, pending] = useActionState(verifyOtpAction, null)
  const [resendPending, startResend] = useTransition()
  const [resendMsg, setResendMsg] = useState("")
  const [pwd, setPwd] = useState("")

  useEffect(() => {
    setPwd(sessionStorage.getItem("temp_reg_pwd") || "")
  }, [])

  const handleResend = () => {
    startResend(async () => {
      const res = await resendOtpAction(emailParam)
      if (res?.error) {
        setResendMsg(res.error)
      } else {
        setResendMsg("A new verification code has been sent.")
      }
    })
  }

  useEffect(() => {
    if (state?.fallbackRedirect && state?.email) {
      // Auto-login failed, fallback to login page
      router.push("/login?verified=true")
    }
  }, [state, router])

  if (!emailParam) {
    return (
      <div className="text-center py-12">
        <h2 className="text-[20px] font-semibold mb-2 text-ink">Invalid Request</h2>
        <p className="text-[14px] text-ink-soft mb-6">No email address was provided for verification.</p>
        <Link href="/register">
          <Button variant="ghost">Return to Registration</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link 
        href="/login" 
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink font-medium mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> Back to login
      </Link>

      <div>
        <h2 className="text-[26px] font-semibold mb-2 text-ink">Verify your email</h2>
        <p className="text-[14.5px] text-ink-soft mb-8 leading-[1.5]">
          We sent a 6-digit verification code to <strong className="text-ink">{emailParam}</strong>. Please enter it below.
        </p>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="email" value={emailParam} />
          <input type="hidden" name="password" value={pwd} />
          
          {state?.error && (
            <div className="bg-coral-soft text-coral p-3 rounded-md text-[13px] font-medium">
              {state.error}
            </div>
          )}

          <div>
            <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">
              Verification Code
            </label>
            <Input
              name="code"
              type="text"
              placeholder="123456"
              maxLength={6}
              required
              autoFocus
              autoComplete="one-time-code"
              className="text-center text-[24px] tracking-[8px] font-semibold"
            />
          </div>

          <Button type="submit" disabled={pending} className="w-full mt-4">
            {pending ? "Verifying..." : "Verify & Continue"}
          </Button>
        </form>

        <div className="mt-8 text-center text-[13.5px] text-ink-soft">
          Didn't receive the code?{" "}
          <button 
            type="button"
            onClick={handleResend} 
            disabled={resendPending}
            className="font-semibold text-forest hover:underline disabled:opacity-50"
          >
            {resendPending ? "Sending..." : "Resend"}
          </button>
          {resendMsg && (
            <div className="mt-2 text-[12.5px] font-medium text-forest">{resendMsg}</div>
          )}
        </div>
      </div>
    </div>
  )
}
