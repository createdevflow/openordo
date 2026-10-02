/**
 * Patient account creation / linking logic.
 *
 * Called at two trigger points (Section 3 of spec):
 *   1. createPatientAction — when clinic staff creates a Patient record
 *   2. When a booking submission creates a Patient row
 *
 * Only runs when the clinic has the "patient-portal" plugin active.
 */

import { db } from "@/lib/db"
import { hasFeature } from "@/lib/features"
import { sendPatientWelcomeEmail } from "@/lib/email"
import { Routes } from "@/lib/routes"

/**
 * After a clinic-scoped Patient row is created, either:
 *   - Link the Patient to an existing PatientAccount (if email/phone matches), or
 *   - Create a new PatientAccount and send a welcome email.
 *
 * Is idempotent — safe to call multiple times; won't create duplicate links.
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
  // Gate: only for clinics with patient-portal feature active
  const hasPortal = await hasFeature(clinicId, "communication.patient_portal")
  if (!hasPortal) return


  const email = patient.email?.trim().toLowerCase() || null
  const phone = patient.phone?.trim().replace(/[^0-9+]/g, "") || null

  if (!email && !phone) return // no identifier to link on

  // Already linked?
  const existingLink = await db.patientAccountLink.findUnique({
    where: { patientId: patient.id }
  })
  if (existingLink) return

  // Look up existing PatientAccount by email or phone
  let account = await db.patientAccount.findFirst({
    where: {
      OR: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ]
    }
  })

  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { name: true, slug: true }
  })

  if (account) {
    // Link existing account to this clinic's Patient
    await db.patientAccountLink.create({
      data: {
        patientAccountId: account.id,
        clinicId,
        patientId: patient.id,
      }
    }).catch(() => {
      // Ignore unique constraint errors (race condition safe)
    })
  } else {
    // Create new account + link
    account = await db.patientAccount.create({
      data: {
        email: email || `${patient.id}@placeholder.local`,
        phone: phone || null,
        name: patient.name,
      }
    })

    await db.patientAccountLink.create({
      data: {
        patientAccountId: account.id,
        clinicId,
        patientId: patient.id,
      }
    })

    // Send welcome email (non-blocking)
    if (email && clinic) {
      sendPatientWelcomeEmail({
        to: email,
        patientName: patient.name,
        clinicName: clinic.name,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"}${Routes.PatientPortalForClinic(clinic.slug)}`
      }).catch(console.error)
    }
  }
}
