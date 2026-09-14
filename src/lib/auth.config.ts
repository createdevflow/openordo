import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  providers: [],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.clinicId = user.clinicId
        token.role = user.role
        token.platformRole = user.platformRole
      }
      
      if (trigger === "update" && session) {
        token.clinicId = session.clinicId
        token.role = session.role
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
      }
      return session
    }
  },
  session: { strategy: "jwt" }
} satisfies NextAuthConfig
