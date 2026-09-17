"use server"

import { db } from "@/lib/db"
import { sendVerificationOtp } from "@/lib/email"
import { signIn } from "@/lib/auth"
import { isRedirectError } from "next/dist/client/components/redirect-error"

export async function verifyOtpAction(prevState: any, formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const code = (formData.get("code") as string)?.trim()

  if (!email || !code) {
    return { error: "Missing email or code." }
  }

  // Find the token
  const otpRecord = await (db as any).otpToken.findFirst({
    where: { email, code },
    orderBy: { createdAt: "desc" }
  })

  if (!otpRecord || new Date() > new Date(otpRecord.expiresAt)) {
    return { error: "Invalid or expired verification code." }
  }

  // Activate the user
  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return { error: "User not found." }
  }

  await db.user.update({
    where: { id: user.id },
    data: { status: "ACTIVE" }
  })

  // Delete the used token
  await (db as any).otpToken.delete({ where: { id: otpRecord.id } })

  // Auto sign-in and redirect to onboarding — no need to ask user to log in again
  try {
    await signIn("credentials", {
      identifier: email,
      password: formData.get("password") as string,
      redirectTo: "/onboarding/clinic",
    })
  } catch (err) {
    // NextAuth throws a NEXT_REDIRECT — we must re-throw it so the redirect works
    if (isRedirectError(err)) throw err
    // If sign-in failed (e.g. password not provided), fall back to login page with verified flag
    return { success: true, email, fallbackRedirect: true }
  }

  return { success: true, email }
}

export async function resendOtpAction(email: string) {
  if (!email) return { error: "Email is required." }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) return { error: "User not found." }
  if (user.status !== "PENDING_VERIFICATION") return { error: "Account is already verified." }

  // Clean old tokens
  await (db as any).otpToken.deleteMany({ where: { email } })

  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 mins

  await (db as any).otpToken.create({
    data: { email, code: otpCode, expiresAt }
  })

  const sent = await sendVerificationOtp(email, otpCode)
  if (!sent) {
    return { error: "Failed to send verification email. Please check your SMTP settings or try again later." }
  }

  return { success: true }
}
