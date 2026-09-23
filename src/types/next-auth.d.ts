import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      clinicId: string | null
      role: string | null
      platformRole: string
      onboardingStep: string  // added for Google OAuth + onboarding resume logic
    } & DefaultSession["user"]
  }

  interface User {
    username?: string
    clinicId?: string | null
    role?: string | null
    platformRole?: string
    onboardingStep?: string  // added for Google OAuth
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string
    username?: string
    clinicId?: string | null
    role?: string | null
    platformRole?: string
    onboardingStep?: string
  }
}
