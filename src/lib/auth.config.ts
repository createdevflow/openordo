import type { NextAuthConfig } from "next-auth"

// Type augmentation lives in src/types/next-auth.d.ts — not here.
// This file only contains the edge-safe callback config used by middleware.

export const authConfig = {
  providers: [], // populated in auth.ts
  pages: {
    signIn: "/login",
    error: "/login", // OAuth errors (including cancellations) land on /login?error=
  },
  callbacks: {
    // Edge-safe callbacks only (no DB access — runs in middleware too)
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.username = (user as any).username
        token.clinicId = (user as any).clinicId ?? null
        token.role = (user as any).role ?? null
        token.platformRole = (user as any).platformRole ?? "USER"
        token.onboardingStep = (user as any).onboardingStep ?? "CLINIC_DETAILS"
      }
      if (trigger === "update" && session) {
        if (session.clinicId !== undefined) token.clinicId = session.clinicId
        if (session.role !== undefined) token.role = session.role
        if (session.onboardingStep !== undefined) token.onboardingStep = session.onboardingStep
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.clinicId = token.clinicId as string | null
        session.user.role = token.role as string | null
        session.user.platformRole = token.platformRole as string
        session.user.onboardingStep = (token.onboardingStep as string) ?? "CLINIC_DETAILS"
      }
      return session
    },
  },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig
