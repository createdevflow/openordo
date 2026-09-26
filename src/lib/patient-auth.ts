import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "fallback_secret_for_dev")
const COOKIE_NAME = "patient_account_session"

export type PatientAccountSession = {
  patientAccountId: string
}

// ─── Session helpers ───────────────────────────────────────────────────────────

export async function setPatientAccountSession(patientAccountId: string) {
  const token = await new SignJWT({ patientAccountId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(SECRET)

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60
  })
}

export async function getPatientAccountSession(): Promise<PatientAccountSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, SECRET)
    const id = payload.patientAccountId as string | undefined
    if (!id) return null
    return { patientAccountId: id }
  } catch {
    return null
  }
}

export async function clearPatientAccountSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

// ─── Legacy compat shim — old per-clinic cookie (kept to avoid 404s on old sessions) ──

/** @deprecated Use setPatientAccountSession instead */
export async function setPatientSession(clinicId: string, patientId: string) {
  // No-op shim — callers should be updated to use the account-level session
  console.warn("[patient-auth] setPatientSession is deprecated. Migrate to setPatientAccountSession.")
}

/** @deprecated Use getPatientAccountSession + PatientAccountLink lookup instead */
export async function getPatientSession(clinicId: string) {
  // Returns null — old per-clinic cookies are no longer created
  return null
}

/** @deprecated */
export async function clearPatientSession(clinicId: string) {
  // No-op — old cookies expire naturally
}
