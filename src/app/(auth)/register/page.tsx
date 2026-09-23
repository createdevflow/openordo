"use client"

import React, { useState, Suspense } from "react"
import { useActionState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { registerAccountAction } from "@/server/actions/auth"
import { GoogleButton } from "@/components/ui/GoogleButton"
import { OAuthDivider } from "@/components/ui/OAuthDivider"
import Link from "next/link"
import { Eye, EyeOff, ChevronDown, Check } from "lucide-react"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+27", flag: "🇿🇦", name: "South Africa" },
  { code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "+55", flag: "🇧🇷", name: "Brazil" },
  { code: "+52", flag: "🇲🇽", name: "Mexico" },
  { code: "+86", flag: "🇨🇳", name: "China" },
  { code: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "+82", flag: "🇰🇷", name: "South Korea" },
  { code: "+62", flag: "🇮🇩", name: "Indonesia" },
  { code: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
]

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "" }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { score, label: "Weak", color: "#B5432F" }
  if (score === 2) return { score, label: "Fair", color: "#C8862B" }
  if (score === 3) return { score, label: "Good", color: "#386A8A" }
  if (score === 4) return { score, label: "Strong", color: "#2E6B3E" }
  return { score, label: "Very strong", color: "#1E4638" }
}

const OAUTH_ERROR_MESSAGES: Record<string, string | null> = {
  OAuthAccountNotLinked:
    "That email is already registered with a password. Please sign in with your email and password instead.",
  OAuthSignInError: null,
  OAuthCallbackError: null,
  Callback: null,
}

function RegisterForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const planParam = searchParams.get("plan") || ""
  const oauthErrorCode = searchParams.get("error") || ""
  const oauthError = oauthErrorCode
    ? (OAUTH_ERROR_MESSAGES[oauthErrorCode] ?? "Sign-up failed. Please try again.")
    : null

  const planInfo: Record<string, { name: string; badge: string }> = {
    starter: { name: "Starter Plan", badge: "Forever Free" },
    practice: { name: "Practice Plan", badge: "14-Day Free Trial" },
    "clinic-group": { name: "Clinic Group Plan", badge: "14-Day Free Trial" },
  }
  const selectedInfo = planParam 
    ? (planInfo[planParam.toLowerCase()] || { 
        name: planParam.charAt(0).toUpperCase() + planParam.slice(1) + " Plan", 
        badge: "Selected Plan" 
      }) 
    : null

  const [state, formAction, pending] = useActionState(registerAccountAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [countryCode, setCountryCode] = useState("+91")
  const [showCountryDrop, setShowCountryDrop] = useState(false)
  const [countrySearch, setCountrySearch] = useState("")

  const strength = getPasswordStrength(password)
  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0]
  const filteredCountries = COUNTRY_CODES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.includes(countrySearch)
  )

  useEffect(() => {
    if (state?.redirectToOtp && state?.email) {
      router.push(`/verify-otp?email=${encodeURIComponent(state.email)}`)
    }
  }, [state, router])

  const tips = [
    { met: password.length >= 8, text: "At least 8 characters" },
    { met: /[A-Z]/.test(password), text: "One uppercase letter" },
    { met: /[0-9]/.test(password), text: "One number" },
    { met: /[^A-Za-z0-9]/.test(password), text: "One special character" },
  ]

  return (
    <div>
      <h2 className="text-[26px] font-semibold mb-2">Create your account</h2>
      <p className="text-[14.5px] text-ink-soft mb-6">Start your free trial today. No card required.</p>

      {selectedInfo && (
        <div className="mb-4 rounded-lg border border-line bg-paper-raised p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-moss">Selected Plan</div>
            <div className="text-[15px] font-bold text-ink">{selectedInfo.name}</div>
          </div>
          <span className="rounded-full bg-forest/10 px-3 py-1 text-[12px] font-semibold text-forest">
            {selectedInfo.badge}
          </span>
        </div>
      )}

      {/* Google sign-up — skips account creation + email verification */}
      <GoogleButton label="Sign up with Google" callbackUrl="/onboarding/clinic" />

      <OAuthDivider />

      {oauthError && (
        <div className="mb-4 bg-coral-soft text-coral p-3 rounded-md text-[13px] font-medium">
          {oauthError}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {/* Hidden selected plan */}
        <input type="hidden" name="selectedPlan" value={planParam} />

        {state?.error && (
          <div className="bg-coral-soft text-coral p-3 rounded-md text-[13px] font-medium">
            {state.error}
          </div>
        )}

        {/* Full Name */}
        <div>
          <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">Full Name</label>
          <Input
            name="name"
            type="text"
            placeholder="Dr. Sarah Smith"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">Email</label>
          <Input
            name="email"
            type="email"
            placeholder="sarah@example.com"
            required
          />
        </div>

        {/* Phone with country code */}
        <div>
          <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">Phone Number</label>
          <div className="flex gap-2">
            {/* Country code picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCountryDrop(!showCountryDrop)}
                className="flex items-center gap-1.5 whitespace-nowrap pr-2 cursor-pointer rounded-control border border-line bg-paper-raised px-[13px] py-[11px] text-[14.5px] text-ink transition-colors duration-150 outline-none focus:border-forest"
                style={{ width: 96, justifyContent: "space-between" }}
              >
                <span>{selectedCountry.flag} {selectedCountry.code}</span>
                <ChevronDown size={13} style={{ color: "var(--color-ink-soft)", flexShrink: 0 }} />
              </button>
              {showCountryDrop && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 40 }}
                    onClick={() => setShowCountryDrop(false)}
                  />
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
                    background: "var(--color-paper-raised)", border: "1px solid var(--color-line)",
                    borderRadius: 8, boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
                    width: 220, overflow: "hidden"
                  }}>
                    <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--color-line)" }}>
                      <input
                        autoFocus
                        placeholder="Search country…"
                        value={countrySearch}
                        onChange={e => setCountrySearch(e.target.value)}
                        style={{
                          width: "100%", border: "none", outline: "none", fontSize: 13,
                          background: "transparent", color: "var(--color-ink)"
                        }}
                      />
                    </div>
                    <div style={{ maxHeight: 200, overflowY: "auto" }}>
                      {filteredCountries.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setCountryCode(c.code)
                            setShowCountryDrop(false)
                            setCountrySearch("")
                          }}
                          style={{
                            display: "flex", alignItems: "center", gap: 8, width: "100%",
                            padding: "9px 12px", fontSize: 13, background: "none", border: "none",
                            cursor: "pointer", textAlign: "left",
                            color: countryCode === c.code ? "var(--color-forest)" : "var(--color-ink)",
                            fontWeight: countryCode === c.code ? 600 : 400
                          }}
                          onMouseOver={e => (e.currentTarget.style.background = "var(--color-paper)")}
                          onMouseOut={e => (e.currentTarget.style.background = "none")}
                        >
                          <span>{c.flag}</span>
                          <span style={{ flex: 1 }}>{c.name}</span>
                          <span style={{ color: "var(--color-ink-soft)", fontSize: 12 }}>{c.code}</span>
                          {countryCode === c.code && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <Input
              name="phone"
              type="tel"
              placeholder="9876543210"
              className="flex-1"
            />
            {/* Hidden field to submit country code */}
            <input type="hidden" name="countryCode" value={countryCode} />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">Password</label>
          <div style={{ position: "relative" }}>
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ paddingRight: 40 }}
              placeholder="Create a strong password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--color-ink-soft)", display: "flex", alignItems: "center"
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Strength bar */}
          {password && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i <= strength.score ? strength.color : "var(--color-line)",
                      transition: "background 0.2s ease"
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: strength.color }}>
                  {strength.label}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end" }}>
                  {tips.map((tip, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex", alignItems: "center", gap: 4, fontSize: 11,
                        color: tip.met ? "var(--color-success)" : "var(--color-ink-soft)"
                      }}
                    >
                      <Check size={10} style={{ opacity: tip.met ? 1 : 0.3 }} />
                      {tip.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={pending}
          className="w-full mt-2"
        >
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <div className="mt-8 text-center text-[13.5px] text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-forest hover:underline">Log in</Link>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-soft">Loading registration...</div>}>
      <RegisterForm />
    </Suspense>
  )
}
