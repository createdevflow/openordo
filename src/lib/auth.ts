import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import bcrypt from "bcrypt"
import { z } from "zod"
import { authConfig } from "./auth.config"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email or Phone", type: "text" },
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const rawIdentifier = ((credentials?.identifier || credentials?.email) as string)?.trim()
        const rawPassword = credentials?.password as string

        if (!rawIdentifier || !rawPassword || rawPassword.length < 6) {
          return null
        }

        let user: any = null

        // If it looks like an email
        if (rawIdentifier.includes("@")) {
          user = await db.user.findUnique({
            where: { email: rawIdentifier.toLowerCase() },
          })
        } else {
          // Otherwise search by phone number or username
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
            where: {
              userId_clinicId: {
                userId: user.id,
                clinicId: user.activeClinicId,
              }
            }
          })
          if (membership) {
            role = membership.role
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          clinicId: user.activeClinicId,
          role: role,
          platformRole: user.platformRole,
        }
      },
    }),
  ],
})
