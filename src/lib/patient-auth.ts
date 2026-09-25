import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "fallback_secret_for_dev")

export type PatientSession = {
  patientId: string
  clinicId: string
}

export async function setPatientSession(clinicId: string, patientId: string) {
  const token = await new SignJWT({ patientId, clinicId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET)

  const cookieStore = await cookies()
  cookieStore.set(`patient_session_${clinicId}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 // 7 days
  })
}

export async function getPatientSession(clinicId: string): Promise<PatientSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(`patient_session_${clinicId}`)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, SECRET)
    if (payload.clinicId !== clinicId) return null
    return {
      patientId: payload.patientId as string,
      clinicId: payload.clinicId as string
    }
  } catch (e) {
    return null
  }
}

export async function clearPatientSession(clinicId: string) {
  const cookieStore = await cookies()
  cookieStore.delete(`patient_session_${clinicId}`)
}
