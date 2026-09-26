"use server"

import { db } from "@/lib/db"
import { setPatientAccountSession, getPatientAccountSession, clearPatientAccountSession } from "@/lib/patient-auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { sendPatientLoginCodeEmail } from "@/lib/email"
import bcrypt from "bcryptjs"
import { randomInt } from "crypto"

// ─── Code generation helpers ─────────────────────────────────────────────────

function generateCode(): string {
  return randomInt(100000, 999999).toString()
}

// ─── Step 1: Request login code ──────────────────────────────────────────────

/**
 * Patient requests a 6-digit login code via email or phone identifier.
 * Rate limited: max 3 requests per 15 minutes per identifier.
 * Stores a bcrypt-hashed code in PatientLoginCode.
 */
export async function requestPatientLoginCodeAction(identifier: string) {
  try {
    const cleanId = identifier.trim().toLowerCase()
    if (!cleanId) return { error: "Please enter your email or phone number." }

    // Rate limit: 3 per 15 min per identifier
    const allowed = checkRateLimit(`patient_login_code:${cleanId}`, 3, 15 * 60 * 1000)
    if (!allowed) {
      return { error: "Too many code requests. Please wait 15 minutes before trying again." }
    }

    const digits = cleanId.replace(/[^0-9]/g, "")

    const account = await db.patientAccount.findFirst({
      where: {
        OR: [
          { email: cleanId },
          ...(digits.length >= 7 ? [{ phone: { contains: digits } }] : [])
        ]
      }
    })

    if (!account) {
      return { error: "No patient account found with this email or phone number." }
    }

    const rawCode = generateCode()
    const codeHash = await bcrypt.hash(rawCode, 10)

    await db.patientLoginCode.create({
      data: {
        patientAccountId: account.id,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 min
      }
    })

    // Send email (fire-and-forget; logs to console in dev)
    sendPatientLoginCodeEmail({
      to: account.email,
      patientName: account.name,
      code: rawCode,
    }).catch(console.error)

    // Return dummy code in dev only
    const dummyCode = process.env.NODE_ENV !== "production" ? rawCode : undefined

    return { success: true, hasPassword: !!account.passwordHash, dummyCode }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── Step 2: Verify code ─────────────────────────────────────────────────────

/**
 * Verifies the 6-digit code. On success:
 * - Marks the code consumed, sets emailVerifiedAt if not set
 * - Creates account session
 * - Returns needsPassword=true if no passwordHash set yet
 */
export async function verifyPatientLoginCodeAction(identifier: string, code: string) {
  try {
    const cleanId = identifier.trim().toLowerCase()
    const digits = cleanId.replace(/[^0-9]/g, "")

    const account = await db.patientAccount.findFirst({
      where: {
        OR: [
          { email: cleanId },
          ...(digits.length >= 7 ? [{ phone: { contains: digits } }] : [])
        ]
      },
      include: {
        loginCodes: {
          where: {
            consumedAt: null,
            expiresAt: { gt: new Date() }
          },
          orderBy: { createdAt: "desc" }
        },
        links: {
          include: { clinic: true }
        }
      }
    })

    if (!account) return { error: "Account not found." }

    // Try each unexpired code
    let matchedCode = null
    for (const lc of account.loginCodes) {
      const match = await bcrypt.compare(code, lc.codeHash)
      if (match) { matchedCode = lc; break }
    }

    if (!matchedCode) return { error: "Invalid or expired code. Please request a new one." }

    // Mark consumed + set emailVerifiedAt
    await db.patientLoginCode.update({
      where: { id: matchedCode.id },
      data: { consumedAt: new Date() }
    })

    if (!account.emailVerifiedAt) {
      await db.patientAccount.update({
        where: { id: account.id },
        data: { emailVerifiedAt: new Date() }
      })
    }

    await setPatientAccountSession(account.id)

    const clinics = account.links.map(l => ({
      id: l.clinic.id,
      name: l.clinic.name,
      slug: l.clinic.slug
    }))

    return {
      success: true,
      needsPassword: !account.passwordHash,
      clinics
    }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── Step 3: Login with password ─────────────────────────────────────────────

export async function loginPatientWithPasswordAction(identifier: string, password: string) {
  try {
    const cleanId = identifier.trim().toLowerCase()
    const digits = cleanId.replace(/[^0-9]/g, "")

    const allowed = checkRateLimit(`patient_password:${cleanId}`, 10, 15 * 60 * 1000)
    if (!allowed) {
      return { error: "Too many login attempts. Please try again in 15 minutes." }
    }

    const account = await db.patientAccount.findFirst({
      where: {
        OR: [
          { email: cleanId },
          ...(digits.length >= 7 ? [{ phone: { contains: digits } }] : [])
        ]
      },
      include: { links: { include: { clinic: true } } }
    })

    if (!account || !account.passwordHash) {
      return { error: "Invalid credentials. Use a login code if you haven't set a password yet." }
    }

    const valid = await bcrypt.compare(password, account.passwordHash)
    if (!valid) return { error: "Incorrect password." }

    await setPatientAccountSession(account.id)

    const clinics = account.links.map(l => ({
      id: l.clinic.id,
      name: l.clinic.name,
      slug: l.clinic.slug
    }))

    return { success: true, clinics }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── Step 4: Set password (first-time or reset) ──────────────────────────────

export async function setPatientPasswordAction(newPassword: string, confirmPassword: string) {
  try {
    if (newPassword !== confirmPassword) return { error: "Passwords do not match." }
    if (newPassword.length < 8) return { error: "Password must be at least 8 characters." }

    const session = await getPatientAccountSession()
    if (!session) return { error: "Session expired. Please log in again." }

    const passwordHash = await bcrypt.hash(newPassword, 12)

    const account = await db.patientAccount.update({
      where: { id: session.patientAccountId },
      data: { passwordHash },
      include: { links: { include: { clinic: true } } }
    })

    const clinics = account.links.map(l => ({
      id: l.clinic.id,
      name: l.clinic.name,
      slug: l.clinic.slug
    }))

    return { success: true, clinics }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── Portal data actions (all scoped through PatientAccountLink) ──────────────

export async function getPatientPortalDataAction(clinicSlug: string) {
  try {
    const session = await getPatientAccountSession()
    if (!session) return { error: "Unauthorized" }

    const clinic = await db.clinic.findUnique({
      where: { slug: clinicSlug },
      include: { bookingPageConfig: true }
    })
    if (!clinic || clinic.status !== "ACTIVE") return { error: "Clinic not found." }

    // Isolation: route through PatientAccountLink
    const link = await db.patientAccountLink.findUnique({
      where: {
        patientAccountId_clinicId: {
          patientAccountId: session.patientAccountId,
          clinicId: clinic.id
        }
      },
      include: {
        patient: {
          include: {
            appointments: { include: { doctor: true }, orderBy: { date: "desc" } },
            invoices: { orderBy: { date: "desc" } },
            records: { include: { doctor: true }, orderBy: { date: "desc" } },
            prescriptions: { include: { doctor: true }, orderBy: { date: "desc" } },
            PatientDocument: { orderBy: { createdAt: "desc" } }
          }
        }
      }
    })

    if (!link) return { error: "You don't have a patient record at this clinic." }

    const account = await db.patientAccount.findUnique({
      where: { id: session.patientAccountId },
      select: { id: true, name: true, email: true, phone: true }
    })

    return {
      success: true,
      patient: link.patient,
      clinic,
      account,
      shareRecords: clinic.shareRecordsWithPatients
    }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function getPatientLinkedClinicsAction() {
  try {
    const session = await getPatientAccountSession()
    if (!session) return { error: "Unauthorized" }

    const links = await db.patientAccountLink.findMany({
      where: { patientAccountId: session.patientAccountId },
      include: { clinic: { include: { bookingPageConfig: true } } }
    })

    return {
      success: true,
      clinics: links.map(l => ({
        id: l.clinic.id,
        name: l.clinic.name,
        slug: l.clinic.slug,
        accentColor: l.clinic.bookingPageConfig?.accentColor || "#1E4638",
        logoUrl: l.clinic.bookingPageConfig?.logoUrl || null
      }))
    }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function getPatientNotificationsAction(clinicSlug: string) {
  try {
    const session = await getPatientAccountSession()
    if (!session) return { error: "Unauthorized" }

    const clinic = await db.clinic.findUnique({ where: { slug: clinicSlug } })
    if (!clinic) return { error: "Clinic not found." }

    // Verify link
    const link = await db.patientAccountLink.findUnique({
      where: {
        patientAccountId_clinicId: {
          patientAccountId: session.patientAccountId,
          clinicId: clinic.id
        }
      }
    })
    if (!link) return { error: "Unauthorized" }

    const notifications = await db.patientNotification.findMany({
      where: {
        patientAccountId: session.patientAccountId,
        clinicId: clinic.id
      },
      orderBy: { createdAt: "desc" },
      take: 50
    })

    return { success: true, notifications }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function markPatientNotificationReadAction(notificationId: string) {
  try {
    const session = await getPatientAccountSession()
    if (!session) return { error: "Unauthorized" }

    await db.patientNotification.updateMany({
      where: {
        id: notificationId,
        patientAccountId: session.patientAccountId, // isolation
        readAt: null
      },
      data: { readAt: new Date() }
    })

    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function updatePatientContactInfoAction(data: {
  phone?: string
  email?: string
  address?: string
}) {
  try {
    const session = await getPatientAccountSession()
    if (!session) return { error: "Unauthorized" }

    // Update PatientAccount (global contact info)
    await db.patientAccount.update({
      where: { id: session.patientAccountId },
      data: {
        ...(data.email ? { email: data.email.trim().toLowerCase(), emailVerifiedAt: null } : {}),
        ...(data.phone ? { phone: data.phone.trim() } : {})
      }
    })

    return { success: true }
  } catch (e: any) {
    if (e.code === "P2002") return { error: "That email or phone is already registered to another account." }
    return { error: e.message }
  }
}

export async function logoutPatientAction() {
  await clearPatientAccountSession()
  return { success: true }
}

// ─── Legacy shims (used by existing portal/[slug]/login) ──────────────────────
// These are kept so the existing /portal/[slug]/login page still compiles.
// They redirect to the new account-based flow.

/** @deprecated Use requestPatientLoginCodeAction instead */
export async function requestPatientPortalOtpAction(clinicId: string, identifier: string) {
  return requestPatientLoginCodeAction(identifier)
}

/** @deprecated Use verifyPatientLoginCodeAction instead */
export async function verifyPatientPortalOtpAction(clinicId: string, identifier: string, code: string) {
  const res = await verifyPatientLoginCodeAction(identifier, code)
  if (res.error) return { error: res.error }
  return { success: true }
}

/** @deprecated */
export async function requestGlobalPatientPortalOtpAction(identifier: string) {
  return requestPatientLoginCodeAction(identifier)
}

/** @deprecated */
export async function verifyGlobalPatientPortalOtpAction(identifier: string, code: string) {
  return verifyPatientLoginCodeAction(identifier, code)
}
