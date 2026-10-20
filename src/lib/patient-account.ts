/**
 * Patient account creation / linking logic.
 *
 * Called whenever a patient is registered or updated under any clinic:
 *   1. createPatientAction & updatePatientAction — clinic staff registers/updates a Patient
 *   2. acceptBookingAction — booking submission creates a Patient
 *   3. createAppointmentAction — appointment with newPatient creates a Patient
 *   4. Portal login auto-provisioning
 *
 * Enables patient portal access for patients across all clinics.
 */

import { db } from "@/lib/db"
import { sendPatientWelcomeEmail } from "@/lib/email"
import { Routes } from "@/lib/routes"

/**
 * Ensures a clinic-scoped Patient row is linked to a global PatientAccount:
 *   - If PatientAccount already exists by email or phone, link it and sync updated contact info
 *   - If no PatientAccount exists, create one and link it
 *
 * Safe to call multiple times (idempotent).
 */
export async function ensurePatientAccount(
  clinicId: string,
  patient: {
    id: string
    name: string
    email?: string | null
    phone?: string | null
  }
): Promise<void> {
  const email = patient.email?.trim().toLowerCase() || null
  const phone = patient.phone?.trim() || null
  const digits = phone ? phone.replace(/[^0-9]/g, "") : ""
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits

  if (!email && !phone) return // no identifier to link on

  const phoneConditions: any[] = []
  if (digits.length >= 7) {
    phoneConditions.push({ phone: { contains: digits } })
    if (last10 !== digits && last10.length >= 7) {
      phoneConditions.push({ phone: { contains: last10 } })
    }
  }

  // 1. Look up existing PatientAccount by email first (case-insensitive)
  let account = email ? await db.patientAccount.findFirst({
    where: { email: { equals: email, mode: "insensitive" as const } }
  }) : null

  // 2. If not found by email, check by phone only if candidate has no different real email
  if (!account && phoneConditions.length > 0) {
    const candidate = await db.patientAccount.findFirst({
      where: { OR: phoneConditions }
    })
    if (candidate) {
      const candidateEmail = candidate.email.toLowerCase()
      // Only reuse if candidate has a placeholder email or matching email
      if (candidateEmail.includes("@placeholder.local") || (email && candidateEmail === email)) {
        account = candidate
      }
    }
  }

  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { name: true, slug: true }
  })

  if (account) {
    // If account had a placeholder email but now has a real email, update it
    const isPlaceholder = account.email.includes("@placeholder.local")
    const updateData: any = {}
    if (email && isPlaceholder) {
      updateData.email = email
    }
    if (phone && !account.phone) {
      updateData.phone = phone
    }
    if (patient.name && (!account.name || account.name === "Patient")) {
      updateData.name = patient.name
    }
    if (Object.keys(updateData).length > 0) {
      try {
        account = await db.patientAccount.update({
          where: { id: account.id },
          data: updateData
        })
      } catch (err) {
        // Ignore potential duplicate email conflict if already taken
      }
    }

    // Ensure link exists for this patient record pointing to the correct account
    const existingLink = await db.patientAccountLink.findUnique({
      where: { patientId: patient.id }
    })

    if (!existingLink) {
      await db.patientAccountLink.create({
        data: {
          patientAccountId: account.id,
          clinicId,
          patientId: patient.id,
        }
      }).catch(() => {})
    } else if (existingLink.patientAccountId !== account.id) {
      await db.patientAccountLink.update({
        where: { id: existingLink.id },
        data: { patientAccountId: account.id }
      }).catch(() => {})
    }
  } else {
    // Create new account + link
    const placeholderEmail = phone && digits
      ? `phone_${digits}@placeholder.local`
      : `${patient.id}@placeholder.local`

    try {
      account = await db.patientAccount.create({
        data: {
          email: email || placeholderEmail,
          phone: phone || null,
          name: patient.name || "Patient",
        }
      })

      await db.patientAccountLink.create({
        data: {
          patientAccountId: account.id,
          clinicId,
          patientId: patient.id,
        }
      })

      // Send welcome email if real email is present and clinic exists (non-blocking)
      if (email && clinic && !email.includes("@placeholder.local")) {
        sendPatientWelcomeEmail({
          to: email,
          patientName: patient.name,
          clinicName: clinic.name,
          loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"}${Routes.PatientPortalForClinic(clinic.slug)}`
        }).catch(console.error)
      }
    } catch (err: any) {
      // If email conflict occurred, attempt to link to the existing account with that email
      if (err.code === "P2002" && email) {
        const fallback = await db.patientAccount.findFirst({
          where: { email: { equals: email, mode: "insensitive" as const } }
        })
        if (fallback) {
          await db.patientAccountLink.create({
            data: {
              patientAccountId: fallback.id,
              clinicId,
              patientId: patient.id,
            }
          }).catch(() => {})
        }
      }
    }
  }
}

