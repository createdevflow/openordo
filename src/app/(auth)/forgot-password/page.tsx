"use client"

import { useActionState } from "react"
import { forgotPasswordAction } from "@/server/actions/auth"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import Link from "next/link"
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, null)

  return (
    <div>
      <Link 
        href="/login" 
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink font-medium mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> Back to login
      </Link>

      {state?.success ? (
        <div className="space-y-6">
          <div className="w-12 h-12 rounded-full bg-forest/10 text-forest flex items-center justify-center">
            <Mail size={24} />
          </div>

          <div>
            <h2 className="text-[24px] font-semibold mb-2 text-ink">Check your inbox</h2>
            <p className="text-[14px] text-ink-soft leading-[1.55]">
              If an account exists for <strong className="text-ink">{state.email}</strong>, we have sent instructions to reset your password.
            </p>
          </div>

          <div className="rounded-lg bg-paper p-4 border border-line text-[13px] text-ink-soft leading-[1.5]">
            <p className="m-0 mb-2 font-medium text-ink">Didn't receive the email?</p>
            <ul className="m-0 pl-4 space-y-1 list-disc">
              <li>Check your spam or junk folder.</li>
              <li>Make sure the email address entered matches your clinic account.</li>
              <li>Password reset links expire in 1 hour for security.</li>
            </ul>
          </div>

          <Link href="/login" className="block w-full">
            <Button variant="ghost" className="w-full">
              Return to login
            </Button>
          </Link>
        </div>
      ) : (
        <div>
          <h2 className="text-[26px] font-semibold mb-2 text-ink">Forgot password?</h2>
          <p className="text-[14.5px] text-ink-soft mb-8 leading-[1.5]">
            No worries. Enter your registered email address and we'll send you a password reset link.
          </p>

          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="bg-coral-soft text-coral p-3 rounded-md text-[13px] font-medium">
                {state.error}
              </div>
            )}

            <div>
              <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">
                Email Address
              </label>
              <Input
                name="email"
                type="email"
                placeholder="sarah@example.com"
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            <Button type="submit" disabled={pending} className="w-full mt-4">
              {pending ? "Sending reset link..." : "Send reset link"}
            </Button>
          </form>

          <div className="mt-8 text-center text-[13.5px] text-ink-soft">
            Remember your password?{" "}
            <Link href="/login" className="font-semibold text-forest hover:underline">
              Log in
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
