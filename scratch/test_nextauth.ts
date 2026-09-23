import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth(async (req) => {
  return {
    providers: [
      Google({
        clientId: "test",
        clientSecret: "test"
      })
    ]
  }
})
