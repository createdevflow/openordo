"use server"

import { signIn } from "@/lib/auth"
import { AuthError } from "next-auth"
import { z } from "zod"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"

export async function loginAction(prevState: any, formData: FormData) {
  const rawIdentifier = ((formData.get("identifier") || formData.get("email")) as string)?.trim()
  const password = formData.get("password") as string
  const callbackUrl = formData.get("callbackUrl") as string

  if (!rawIdentifier || !password) {
    return { error: "Please enter your email or phone number and password." }
  }

  // Pre-check user status by email, phone, or username
  const cleanDigits = rawIdentifier.replace(/[^0-9]/g, "")
  const user = await db.user.findFirst({
    where: {
      OR: [
        { email: rawIdentifier.toLowerCase() },
        { phone: rawIdentifier },
        { phone: `+91${cleanDigits.replace(/^91/, "")}` },
        ...(cleanDigits.length >= 7 ? [
          { phone: { contains: cleanDigits } },
          { phone: { endsWith: cleanDigits } }
        ] : []),
        { username: rawIdentifier }
      ]
    },
    select: { id: true, email: true, platformRole: true, activeClinicId: true, onboardingStep: true, status: true }
  })

  if (user?.status === "BANNED") {
    return { error: "Your account has been suspended. Please contact support." }
  }

  // Determine redirect URL
  let targetUrl = "/dashboard"
  if (callbackUrl && callbackUrl.startsWith("/") && callbackUrl !== "/login" && callbackUrl !== "/register") {
    targetUrl = callbackUrl
  } else if (user?.platformRole === "SUPER_ADMIN" && !user?.activeClinicId) {
    targetUrl = "/admin"
  } else if (!user?.activeClinicId || user?.onboardingStep !== "COMPLETED") {
    if (user?.onboardingStep === "COMPLIANCE") targetUrl = "/onboarding/compliance"
    else if (user?.onboardingStep === "STAFF") targetUrl = "/onboarding/staff"
    else if (user?.onboardingStep === "PLAN_SELECTION") targetUrl = "/onboarding/plan"
    else targetUrl = "/onboarding/clinic"
  }

  const authData = new FormData()
  authData.set("identifier", rawIdentifier)
  authData.set("email", user ? user.email : rawIdentifier)
  authData.set("password", password)
  authData.set("redirectTo", targetUrl)

  try {
    await signIn("credentials", authData)
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email/phone or password." }
        default:
          return { error: "Something went wrong. Please try again." }
      }
    }
    throw error // Important: Next.js NEXT_REDIRECT must be rethrown!
  }
}

export async function registerAccountAction(prevState: any, formData: FormData) {
  const name = (formData.get("name") as string)?.trim()
  const email = (formData.get("email") as string)?.toLowerCase().trim()
  const password = formData.get("password") as string
  const phoneRaw = (formData.get("phone") as string)?.trim()
  const countryCode = (formData.get("countryCode") as string) || "+91"
  const phone = phoneRaw ? `${countryCode}${phoneRaw.replace(/^0+/, "")}` : undefined
  const selectedPlan = (formData.get("selectedPlan") as string)?.trim()

  if (selectedPlan) {
    try {
      const cookieStore = await cookies()
      cookieStore.set("selected_plan", selectedPlan, { path: "/", maxAge: 60 * 60 * 24 })
    } catch (e) {}
  }

  if (!name || !email || !password) {
    return { error: "Please fill in all required fields." }
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." }
  }

  // Generate username from name
  let baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")
  if (baseUsername.length < 3) baseUsername = baseUsername.padEnd(3, "0")
  if (baseUsername.length > 30) baseUsername = baseUsername.substring(0, 30)
  
  let username = baseUsername
  let attempt = 1
  while (await db.user.findUnique({ where: { username } })) {
    attempt++
    username = `${baseUsername}-${attempt}`
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return { error: "An account with this email already exists." }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      username,
      onboardingStep: "CLINIC_DETAILS",
      status: "ACTIVE",
      ...(phone ? { phone } : {})
    }
  })

  // Auto login and immediately redirect to onboarding
  const authData = new FormData()
  authData.set("email", email)
  authData.set("password", password)
  authData.set("redirectTo", "/onboarding/clinic")

  try {
    await signIn("credentials", authData)
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created! Please log in to continue." }
    }
    throw error // Important: Next.js NEXT_REDIRECT must be rethrown!
  }
}

export async function forgotPasswordAction(prevState: any, formData: FormData) {
  const email = (formData.get("email") as string)?.toLowerCase().trim()

  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address." }
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true }
  })

  if (user) {
    // Generate secure reset token
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    const token = Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("")
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // 1 hour validity

    // Clean up any existing tokens for this email
    await (db as any).passwordResetToken.deleteMany({
      where: { email }
    })

    // Store new token
    await (db as any).passwordResetToken.create({
      data: {
        email,
        token,
        expiresAt
      }
    })

    // In a production setup, send email via nodemailer / Resend / Postmark
    console.log(`[PASSWORD RESET LINK] For ${email}: /reset-password?token=${token}`)
  }

  // Always return success for security (prevents user enumeration)
  return { 
    success: true, 
    email,
    message: "If an account exists with this email address, password reset instructions have been sent." 
  }
}

export async function resetPasswordAction(prevState: any, formData: FormData) {
  const token = (formData.get("token") as string)?.trim()
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!token) {
    return { error: "Invalid or missing reset token." }
  }

  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters long." }
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." }
  }

  const resetRecord = await (db as any).passwordResetToken.findUnique({
    where: { token }
  })

  if (!resetRecord || new Date() > new Date(resetRecord.expiresAt)) {
    return { error: "This password reset link has expired or is invalid. Please request a new one." }
  }

  const user = await db.user.findUnique({
    where: { email: resetRecord.email }
  })

  if (!user) {
    return { error: "User account not found." }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash }
  })

  // Delete used token
  await (db as any).passwordResetToken.delete({
    where: { id: resetRecord.id }
  })

  return { success: true, message: "Your password has been reset successfully! You can now sign in with your new password." }
}

