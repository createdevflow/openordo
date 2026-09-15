"use client"

import { useActionState, Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { loginAction } from "@/server/actions/auth"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import Link from "next/link"
import { Eye, EyeOff, CheckCircle2 } from "lucide-react"

function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrl = searchParams.get("callbackUrl") || ""
  const verified = searchParams.get("verified")

  useEffect(() => {
    if (state?.redirectToOtp && state?.email) {
      router.push(`/verify-otp?email=${encodeURIComponent(state.email)}`)
    }
  }, [state, router])

  return (
    <form action={formAction} className="space-y-4">
      {verified && !state?.error && (
        <div className="bg-forest-soft text-forest p-3 rounded-md text-[13px] font-medium flex items-center gap-2">
          <CheckCircle2 size={16} /> Email verified! You can now sign in.
        </div>
      )}
      
      {state?.error && (
        <div className="bg-coral-soft text-coral p-3 rounded-md text-[13px] font-medium">
          {state.error}
        </div>
      )}
      
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
          <label className="block text-[13px] font-semibold text-ink-soft">
            Password
          </label>
          <Link 
            href="/forgot-password" 
            className="text-[12.5px] font-semibold text-forest hover:underline"
          >
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
  )
}

export default function LoginPage() {
  return (
    <div>
      <h2 className="text-[26px] font-semibold mb-2">Welcome back</h2>
      <p className="text-[14.5px] text-ink-soft mb-8">Sign in to your OpenORDO account.</p>
      
      <Suspense fallback={<div className="text-center py-4 text-ink-soft">Loading...</div>}>
        <LoginForm />
      </Suspense>

      <div className="mt-8 text-center text-[13.5px] text-ink-soft">
        Don't have an account? <Link href="/register" className="font-semibold text-forest hover:underline">Start free</Link>
      </div>
    </div>
  )
}
