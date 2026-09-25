"use server"

import { db } from "@/lib/db"
import { randomInt } from "crypto"
import { setPatientSession } from "@/lib/patient-auth"

export async function requestPatientPortalOtpAction(clinicId: string, identifier: string) {
  try {
    const cleanId = identifier.trim().toLowerCase()
    if (!cleanId) return { error: "Please enter your email or phone number." }

    // Find the patient in this clinic
    const patient = await db.patient.findFirst({
      where: {
        clinicId,
        OR: [
          { email: cleanId },
          { phone: { contains: cleanId.replace(/[^0-9]/g, "") } }
        ]
      }
    })

    if (!patient) {
      // Return a generic success to prevent enum attacks, but in a real app you might want to return an error
      // Or return error if UX permits:
      return { error: "No patient found with this email or phone number in this clinic." }
    }

    // Generate OTP
    const code = randomInt(100000, 999999).toString()
    
    await db.otpToken.create({
      data: {
        email: cleanId, // Using email field to store the identifier for lookup
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 mins
      }
    })

    // In a real app, send OTP via email/SMS here.
    // For demo purposes, we will return the OTP so the user can easily log in.
    console.log(`[PATIENT_PORTAL_OTP] Code: ${code} for Patient: ${patient.id}`)

    return { success: true, dummyCode: code }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function verifyPatientPortalOtpAction(clinicId: string, identifier: string, code: string) {
  try {
    const cleanId = identifier.trim().toLowerCase()
    
    const token = await db.otpToken.findFirst({
      where: {
        email: cleanId,
        code,
        expiresAt: { gt: new Date() }
      }
    })

    if (!token) return { error: "Invalid or expired OTP." }

    const patient = await db.patient.findFirst({
      where: {
        clinicId,
        OR: [
          { email: cleanId },
          { phone: { contains: cleanId.replace(/[^0-9]/g, "") } }
        ]
      }
    })

    if (!patient) return { error: "Patient not found." }

    // Clear token
    await db.otpToken.delete({ where: { id: token.id } })

    // Set session
    await setPatientSession(clinicId, patient.id)

    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}
