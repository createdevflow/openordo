"use client"

import React, { useState, useTransition } from "react"
import { googleSignInAction } from "@/server/actions/auth"

// Google's official G mark SVG — per Google branding guidelines, not recolored.
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <g>
        <path
          d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
          fill="#4285F4"
        />
        <path
          d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
          fill="#34A853"
        />
        <path
          d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
          fill="#FBBC05"
        />
        <path
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
          fill="#EA4335"
        />
      </g>
    </svg>
  )
}

interface GoogleButtonProps {
  label?: string
  callbackUrl?: string
  className?: string
}

export function GoogleButton({ label = "Continue with Google", callbackUrl }: GoogleButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      try {
        await googleSignInAction(callbackUrl)
      } catch (err: any) {
        // NEXT_REDIRECT is thrown on success — ignore it (the redirect happens)
        if (err?.message === "NEXT_REDIRECT" || err?.digest?.startsWith("NEXT_REDIRECT")) return
        // Any other error: surface a brief message
        setError("Could not connect to Google. Please try again.")
      }
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "10px 16px",
          borderRadius: 7,                          // control radius per §1.3
          border: "1px solid var(--color-line)",
          background: "var(--color-paper-raised)",
          color: "var(--color-ink)",
          fontSize: 14.5,
          fontWeight: 600,
          fontFamily: "var(--font-inter, Inter, sans-serif)",
          cursor: isPending ? "wait" : "pointer",
          opacity: isPending ? 0.7 : 1,
          transition: "background 0.15s ease, opacity 0.15s ease",
          outline: "none",
        }}
        onMouseOver={e => { if (!isPending) (e.currentTarget as HTMLButtonElement).style.background = "var(--color-paper)" }}
        onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.background = "var(--color-paper-raised)"}
        onFocus={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 2px var(--color-forest)"}
        onBlur={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"}
        aria-label={label}
      >
        {isPending ? (
          // Spinner that matches the button height
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" stroke="var(--color-line)" strokeWidth="3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-forest)" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <GoogleMark />
        )}
        <span>{isPending ? "Connecting…" : label}</span>
      </button>

      {error && (
        <p style={{
          marginTop: 8,
          fontSize: 12.5,
          color: "var(--color-coral)",
          textAlign: "center",
        }}>
          {error}
        </p>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
