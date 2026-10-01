"use server"

/**
 * Consent recording server actions — CHARTWELL_PRELAUNCH_OPS_SPEC.md §2
 *
 * HARD RULE: Server-side enforcement.  The client checkbox is UX only.
 * These actions reject the request if the acceptance flag isn't explicitly true,
 * regardless of what the client-side form does.
 */

import { db } from "@/lib/db"
import { headers } from "next/headers"
import { logger } from "@/lib/logger"

export type ConsentDocumentType = "TERMS" | "PRIVACY"

/**
 * Record that a user (staff) accepted TERMS and/or PRIVACY.
 * Called during staff registration — writes one ConsentRecord per document type.
 *
 * @param userId       The newly-created User.id
 * @param accepted     Must be strictly `true` — anything else is rejected
 * @param documentTypes Which documents they accepted
 * @param versionLabel  The "Last updated" date string from the live legal page
 */
export async function recordStaffConsent({
  userId,
  accepted,
  documentTypes,
  versionLabel,
}: {
  userId: string
  accepted: boolean
  documentTypes: ConsentDocumentType[]
  versionLabel: string
}): Promise<{ success: boolean; error?: string }> {
  // Server-side enforcement: reject if not explicitly accepted
  if (accepted !== true) {
    logger.warn("Consent rejected server-side: accepted flag was not true", { userId })
    return { success: false, error: "You must accept the Terms of Service and Privacy Policy to continue." }
  }

  if (!documentTypes.length) {
    return { success: false, error: "No document types specified." }
  }

  const headersList = await headers()
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || null

  try {
    await db.consentRecord.createMany({
      data: documentTypes.map((documentType) => ({
        ownerType: "USER",
        ownerId: userId,
        documentType,
        versionLabel,
        ipAddress: ip,
      })),
    })

    logger.info("Staff consent recorded", { userId, documentTypes, versionLabel })
    return { success: true }
  } catch (err) {
    logger.error("Failed to record staff consent", err, { userId })
    return { success: false, error: "Failed to save consent. Please try again." }
  }
}

/**
 * Record that a patient accepted PRIVACY on first portal login / password setup.
 * Patients only accept PRIVACY — the platform Terms are the clinic's agreement.
 *
 * @param patientAccountId  The PatientAccount.id
 * @param accepted          Must be strictly `true`
 * @param versionLabel      The "Last updated" date string from the live Privacy page
 */
export async function recordPatientPrivacyConsent({
  patientAccountId,
  accepted,
  versionLabel,
}: {
  patientAccountId: string
  accepted: boolean
  versionLabel: string
}): Promise<{ success: boolean; error?: string }> {
  // Server-side enforcement
  if (accepted !== true) {
    logger.warn("Patient privacy consent rejected server-side", { patientAccountId })
    return { success: false, error: "You must accept the Privacy Policy to continue." }
  }

  const headersList = await headers()
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || null

  try {
    // Check if they've already consented (idempotent — don't error on duplicate)
    const existing = await db.consentRecord.findFirst({
      where: {
        ownerType: "PATIENT_ACCOUNT",
        ownerId: patientAccountId,
        documentType: "PRIVACY",
      },
    })

    if (existing) {
      // Already consented — update version label if a newer version was shown
      if (existing.versionLabel !== versionLabel) {
        await db.consentRecord.update({
          where: { id: existing.id },
          data: { versionLabel, acceptedAt: new Date(), ipAddress: ip },
        })
      }
      return { success: true }
    }

    await db.consentRecord.create({
      data: {
        ownerType: "PATIENT_ACCOUNT",
        ownerId: patientAccountId,
        documentType: "PRIVACY",
        versionLabel,
        ipAddress: ip,
      },
    })

    logger.info("Patient privacy consent recorded", { patientAccountId, versionLabel })
    return { success: true }
  } catch (err) {
    logger.error("Failed to record patient consent", err, { patientAccountId })
    return { success: false, error: "Failed to save consent. Please try again." }
  }
}

/**
 * Check whether a user has consented to a given document type.
 * Used by forms to pre-populate the checkbox state.
 */
export async function hasUserConsented(
  userId: string,
  documentType: ConsentDocumentType
): Promise<boolean> {
  const record = await db.consentRecord.findFirst({
    where: { ownerType: "USER", ownerId: userId, documentType },
  })
  return !!record
}
