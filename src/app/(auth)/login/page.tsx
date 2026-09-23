"use client"

import { useActionState, Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { loginAction } from "@/server/actions/auth"
import { GoogleButton } from "@/components/ui/GoogleButton"
import { OAuthDivider } from "@/components/ui/OAuthDivider"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import Link from "next/link"
import { Eye, EyeOff, CheckCircle2 } from "lucide-react"

// Maps Auth.js error codes to human-readable messages.
// "OAuthAccountNotLinked" = email registered via credentials, user tried Google.
// "Callback" / "OAuthCallbackError" = popup was closed — show nothing.
const OAUTH_ERROR_MESSAGES: Record<string, string | null> = {
  OAuthAccountNotLinked:
    "That email is already registered with a password. Please sign in with your email and password instead.",
  OAuthSignInError: null,   // popup closed — silent
  OAuthCallbackError: null, // popup closed — silent
  Callback: null,            // popup closed — silent
}

function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrl = searchParams.get("callbackUrl") || ""
  const verified = searchParams.get("verified")
  const oauthErrorCode = searchParams.get("error") || ""
  const oauthError = oauthErrorCode
    ? (OAUTH_ERROR_MESSAGES[oauthErrorCode] ?? "Sign-in failed. Please try again.")
    : null

  useEffect(() => {
    if (state?.redirectToOtp && state?.email) {
      router.push(`/verify-otp?email=${encodeURIComponent(state.email)}`)
    }
  }, [state, router])

  return (
    <div>
      <h2 className="text-[26px] font-semibold mb-2">Welcome back</h2>
      <p className="text-[14.5px] text-ink-soft mb-6">Sign in to your OpenORDO account.</p>

      {/* Google button — primary fast path */}
      <GoogleButton label="Continue with Google" callbackUrl={callbackUrl || undefined} />

      {/* Divider */}
      <OAuthDivider />

      {/* OAuth error (only non-null messages) */}
      {oauthError && (
        <div className="mb-4 bg-coral-soft text-coral p-3 rounded-md text-[13px] font-medium">
          {oauthError}
        </div>
      )}

      {verified && !state?.error && (
        <div className="mb-4 bg-forest-soft text-forest p-3 rounded-md text-[13px] font-medium flex items-center gap-2">
          <CheckCircle2 size={16} /> Email verified! You can now sign in.
        </div>
      )}

      {state?.error && (
        <div className="mb-4 bg-coral-soft text-coral p-3 rounded-md text-[13px] font-medium">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <div>
          <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">
            Email or Phone number
          </label>
          <Input
            name="identifier"
            type="text"
            placeholder="sarah@example.com or +91 98765 43210"
            required
            autoComplete="username"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[13px] font-semibold text-ink-soft">Password</label>
            <Link href="/forgot-password" className="text-[12.5px] font-semibold text-forest hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Enter your password"
              autoComplete="current-password"
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--color-ink-soft)", display: "flex", alignItems: "center",
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <Button type="submit" disabled={pending} className="w-full mt-4">
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div>
      <Suspense fallback={<div className="text-center py-4 text-ink-soft">Loading...</div>}>
        <LoginForm />
      </Suspense>
      <div className="mt-8 text-center text-[13.5px] text-ink-soft">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-forest hover:underline">Start free</Link>
      </div>
    </div>
  )
}
