"use client"

import { useActionState, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { resetPasswordAction } from "@/server/actions/auth"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import Link from "next/link"
import { Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const [state, formAction, pending] = useActionState(resetPasswordAction, null)

  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pass, setPass] = useState("")
  const [confirm, setConfirm] = useState("")

  if (!token) {
    return (
      <div className="space-y-6">
        <div className="bg-coral-soft text-coral p-4 rounded-lg text-[13.5px]">
          <strong>Invalid Link:</strong> No password reset token was provided. Please request a new link.
        </div>
        <Link href="/forgot-password" className="block w-full">
          <Button className="w-full">Request new reset link</Button>
        </Link>
        <div className="text-center text-[13.5px]">
          <Link href="/login" className="text-forest hover:underline font-medium">Back to login</Link>
        </div>
      </div>
    )
  }

  if (state?.success) {
    return (
      <div className="space-y-6">
        <div className="w-12 h-12 rounded-full bg-forest/10 text-forest flex items-center justify-center">
          <CheckCircle2 size={24} />
        </div>

        <div>
          <h2 className="text-[24px] font-semibold mb-2 text-ink">Password updated</h2>
          <p className="text-[14px] text-ink-soft leading-[1.55]">
            {state.message}
          </p>
        </div>

        <Link href="/login" className="block w-full">
          <Button className="w-full">
            Sign in with new password
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-[26px] font-semibold mb-2 text-ink">Set new password</h2>
      <p className="text-[14.5px] text-ink-soft mb-8">
        Enter your new password below to secure your clinic account.
      </p>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        {state?.error && (
          <div className="bg-coral-soft text-coral p-3 rounded-md text-[13px] font-medium">
            {state.error}
          </div>
        )}

        {/* New Password */}
        <div>
          <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">
            New Password
          </label>
          <div className="relative">
            <Input
              name="password"
              type={showPass ? "text" : "password"}
              required
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              style={{
                position: "absolute",
                right: 11,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-ink-soft)",
                display: "flex",
                alignItems: "center"
              }}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <Input
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              style={{
                position: "absolute",
                right: 11,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-ink-soft)",
                display: "flex",
                alignItems: "center"
              }}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <Button type="submit" disabled={pending} className="w-full mt-4">
          {pending ? "Updating password..." : "Reset password"}
        </Button>
      </form>

      <div className="mt-8 text-center text-[13.5px] text-ink-soft">
        <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-forest hover:underline">
          <ArrowLeft size={14} /> Back to login
        </Link>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-soft">Loading password reset...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
