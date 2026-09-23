import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

// ── Username generator (mirrors registerAccountAction logic) ─────────────────
async function generateUsername(name: string): Promise<string> {
  let base = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")
  if (base.length < 3) base = base.padEnd(3, "0")
  if (base.length > 30) base = base.substring(0, 30)
  let username = base
  let attempt = 1
  while (await db.user.findUnique({ where: { username } })) {
    attempt++
    username = `${base}-${attempt}`
  }
  return username
}

let cachedOauthSettings: { AUTH_GOOGLE_ID?: string; AUTH_GOOGLE_SECRET?: string; lastFetched?: number } = {}

async function getOauthSettings() {
  const now = Date.now()
  if (cachedOauthSettings.lastFetched && (now - cachedOauthSettings.lastFetched < 60000)) {
    return cachedOauthSettings
  }

  try {
    const settings = await db.globalSetting.findMany({
      where: { key: { in: ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"] } }
    })
    const map = settings.reduce((acc, s) => {
      acc[s.key] = s.value
      return acc
    }, {} as Record<string, string>)
    
    cachedOauthSettings = {
      AUTH_GOOGLE_ID: map.AUTH_GOOGLE_ID || process.env.AUTH_GOOGLE_ID,
      AUTH_GOOGLE_SECRET: map.AUTH_GOOGLE_SECRET || process.env.AUTH_GOOGLE_SECRET,
      lastFetched: now,
    }
  } catch (e) {
    cachedOauthSettings = {
      AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
      AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
      lastFetched: now,
    }
  }
  
  return cachedOauthSettings
}

export const { handlers, signIn, signOut, auth } = NextAuth(async (req) => {
  const oauth = await getOauthSettings()

  return {
    ...authConfig,
    providers: [
      // ── Google OAuth ────────────────────────────────────────────────────────
      Google({
        clientId: oauth.AUTH_GOOGLE_ID,
        clientSecret: oauth.AUTH_GOOGLE_SECRET,
        authorization: {
          params: {
            prompt: "select_account",
          },
        },
      }),

    // ── Email + password ────────────────────────────────────────────────────
    Credentials({
      credentials: {
        identifier: { label: "Email or Phone", type: "text" },
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        demoToken: { label: "Demo Token", type: "text" }
      },
      async authorize(credentials) {
        if (credentials?.demoToken) {
          const req = await db.demoRequest.findUnique({ where: { token: credentials.demoToken as string } })
          if (!req || req.status === "USED" || req.status === "EXPIRED" || !req.tempUserId) return null
          if (req.expiresAt && req.expiresAt < new Date()) {
            // Import dynamically to avoid circular dependencies
            const { cleanupExpiredDemosAction } = await import("@/server/actions/demo")
            await cleanupExpiredDemosAction()
            return null
          }

          
          const user = await db.user.findUnique({ where: { id: req.tempUserId } })
          if (!user) return null

          // Mark as used
          await db.demoRequest.update({ where: { id: req.id }, data: { status: "USED" } })

          let role = null
          if (user.activeClinicId) {
            const membership = await db.membership.findUnique({
              where: { userId_clinicId: { userId: user.id, clinicId: user.activeClinicId } }
            })
            if (membership) role = membership.role
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            username: user.username,
            clinicId: user.activeClinicId,
            role,
            platformRole: user.platformRole,
            onboardingStep: user.onboardingStep,
          }
        }

        const rawIdentifier = ((credentials?.identifier || credentials?.email) as string)?.trim()
        const rawPassword = credentials?.password as string

        if (!rawIdentifier || !rawPassword || rawPassword.length < 6) {
          return null
        }

        let user: any = null

        if (rawIdentifier.includes("@")) {
          user = await db.user.findUnique({ where: { email: rawIdentifier.toLowerCase() } })
        } else {
          const cleanDigits = rawIdentifier.replace(/[^0-9]/g, "")
          user = await db.user.findFirst({
            where: {
              OR: [
                { phone: rawIdentifier },
                { phone: `+91${cleanDigits.replace(/^91/, "")}` },
                ...(cleanDigits.length >= 7 ? [
                  { phone: { contains: cleanDigits } },
                  { phone: { endsWith: cleanDigits } }
                ] : []),
                { username: rawIdentifier }
              ]
            }
          })
        }

        if (!user || !user.passwordHash) return null
        if (user.status === "BANNED" || user.status === "SOFT_DELETED") return null

        const passwordsMatch = await bcrypt.compare(rawPassword, user.passwordHash)
        if (!passwordsMatch) return null

        let role = null
        if (user.activeClinicId) {
          const membership = await db.membership.findUnique({
            where: { userId_clinicId: { userId: user.id, clinicId: user.activeClinicId } }
          })
          if (membership) role = membership.role
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          clinicId: user.activeClinicId,
          role,
          platformRole: user.platformRole,
          onboardingStep: user.onboardingStep,
        }
      },
    }),
  ],

  callbacks: {
    // ── signIn: runs for OAuth providers before the session is created ──────
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true // credentials handled in authorize()

      const email = user.email?.toLowerCase()
      if (!email) return false

      // Look for an existing user by email first
      const existing = await db.user.findUnique({ where: { email } })

      if (existing) {
        if (existing.status === "BANNED" || existing.status === "SOFT_DELETED") {
          return false // block sign-in
        }
        // Link Google account if not already linked
        if (!existing.googleId) {
          await db.user.update({
            where: { id: existing.id },
            data: {
              googleId: account.providerAccountId,
              // Upgrade status from PENDING_VERIFICATION if they were created via email
              status: existing.status === "PENDING_VERIFICATION" ? "ACTIVE" : existing.status,
              // Store Google avatar if user has no image yet
              image: existing.image ?? (user.image || null),
            },
          })
        }
        // Carry the DB id so the jwt callback can read it
        user.id = existing.id
      } else {
        // ── First-time Google sign-up: provision a new User ─────────────────
        const username = await generateUsername(user.name ?? email.split("@")[0])
        const newUser = await db.user.create({
          data: {
            name: user.name ?? email.split("@")[0],
            email,
            googleId: account.providerAccountId,
            username,
            image: user.image || null,
            status: "ACTIVE",              // email already verified by Google
            onboardingStep: "CLINIC_DETAILS",
            platformRole: "USER",
          },
        })
        user.id = newUser.id
      }

      return true
    },

    // ── jwt: build/maintain the token shape ──────────────────────────────────
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        // Called right after signIn / authorize returns
        token.id = user.id
        token.username = (user as any).username
        token.clinicId = (user as any).clinicId ?? null
        token.role = (user as any).role ?? null
        token.platformRole = (user as any).platformRole ?? "USER"
        token.onboardingStep = (user as any).onboardingStep ?? "CLINIC_DETAILS"
      }

      // For Google sign-in, user object from signIn callback doesn't carry our
      // custom fields — load them from DB using the id we stored above.
      if (account?.provider === "google" && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            username: true,
            activeClinicId: true,
            platformRole: true,
            onboardingStep: true,
          },
        })
        if (dbUser) {
          token.username = dbUser.username
          token.clinicId = dbUser.activeClinicId ?? null
          token.platformRole = dbUser.platformRole
          token.onboardingStep = dbUser.onboardingStep

          // Load clinic role
          if (dbUser.activeClinicId) {
            const membership = await db.membership.findUnique({
              where: {
                userId_clinicId: { userId: token.id as string, clinicId: dbUser.activeClinicId }
              },
              select: { role: true },
            })
            token.role = membership?.role ?? null
          }
        }
      }

      // Session update trigger (e.g. after clinic creation)
      if (trigger === "update" && session) {
        if (session.clinicId !== undefined) token.clinicId = session.clinicId
        if (session.role !== undefined) token.role = session.role
        if (session.onboardingStep !== undefined) token.onboardingStep = session.onboardingStep
      }

      return token
    },

    // ── session: expose token fields to client session ────────────────────────
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.clinicId = token.clinicId as string | null
        session.user.role = token.role as string | null
        session.user.platformRole = token.platformRole as string
        session.user.onboardingStep = token.onboardingStep as string
      }
      return session
    },
  },
} })
