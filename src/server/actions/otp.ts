"use server"

import { db } from "@/lib/db"
import { signIn } from "@/lib/auth"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { sendClinicScopedWhatsAppMessage } from "@/lib/whatsapp-send"
import { sendSms } from "@/lib/sms"
import { sendNotificationEmail } from "@/lib/notifications/send"
import { renderEmailVerificationOtp } from "@/lib/notifications/templates"

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
    data: { 
      status: "ACTIVE",
      ...(user.phone ? { phoneVerifiedAt: new Date() } : {})
    }
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

export async function deliverOtp(userId: string | null, email: string, phone: string | null, code: string): Promise<{ success: boolean; fallbackTriggered?: boolean; error?: string }> {
  const settings = await db.platformCommunicationSettings.findFirst()
  const channels = settings?.otpChannels || ["EMAIL"]
  const mode = settings?.otpMode || "USER_CHOOSES"

  let whatsappSuccess = false
  let smsSuccess = false
  let emailSuccess = false
  
  let attemptedWhatsApp = false
  let attemptedSms = false
  let fallbackTriggered = false

  // Determine if a channel should be tried actively
  const shouldTry = (ch: string) => {
    if (channels.length === 1 && channels.includes(ch)) return true
    if (channels.includes(ch) && mode === "SEND_ALL") return true
    return false
  }

  // 1. Try WhatsApp
  if (shouldTry("WHATSAPP") && phone && settings?.whatsappConnected) {
    attemptedWhatsApp = true
    const res = await sendClinicScopedWhatsAppMessage({
      toPhone: phone,
      eventType: "OTP_VERIFICATION",
      variables: { otp_code: code, expiry_minutes: "15" },
      userId: userId ?? undefined
    })
    whatsappSuccess = res.sent
  }

  // 2. Try SMS
  if (shouldTry("SMS") && phone) {
    attemptedSms = true
    const res = await sendSms({
      toPhone: phone,
      eventType: "OTP_VERIFICATION",
      variables: { otp_code: code, expiry_minutes: "15" },
      userId: userId ?? undefined
    })
    smsSuccess = res.sent
  }

  // 3. Fallback logic or direct Email
  // Send email if:
  // a) EMAIL is an active channel in SEND_ALL
  // b) EMAIL is the ONLY channel selected
  // c) We tried WA or SMS and they failed (fallback)
  // d) It's USER_CHOOSES and no choice is passed in (we default to email to ensure they get something)
  const shouldSendEmail = 
    shouldTry("EMAIL") || 
    (attemptedWhatsApp && !whatsappSuccess) ||
    (attemptedSms && !smsSuccess) ||
    (!attemptedWhatsApp && !attemptedSms) // catches USER_CHOOSES where we haven't sent anything yet

  if (shouldSendEmail) {
    const result = await sendNotificationEmail(
      "EMAIL_VERIFICATION_OTP",
      { toEmail: email, ownerType: "USER", ownerId: userId || null },
      renderEmailVerificationOtp({ code })
    )
    emailSuccess = result.sent
    if ((attemptedWhatsApp && !whatsappSuccess) || (attemptedSms && !smsSuccess)) {
      fallbackTriggered = true
    }
  }

  if (!whatsappSuccess && !smsSuccess && !emailSuccess) {
    return { success: false, error: "Failed to send verification code." }
  }

  return { success: true, fallbackTriggered }
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

  const result = await deliverOtp(user.id, email, user.phone, otpCode)
  if (!result.success) {
    return { error: result.error || "Failed to send verification code. Please check your settings or try again later." }
  }

  if (result.fallbackTriggered) {
    return { success: true, message: "WhatsApp delivery failed, but we sent the code to your email instead." }
  }

  return { success: true }
}
