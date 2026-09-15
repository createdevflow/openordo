"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user || session.user.platformRole !== "SUPER_ADMIN") {
    throw new Error("Unauthorized")
  }
  return session
}

// ── Clinics ──────────────────────────────────────────────────────────────────

export async function suspendClinicAction(clinicId: string) {
  await requireSuperAdmin()
  await db.clinic.update({ where: { id: clinicId }, data: { status: "SUSPENDED" } })
  revalidatePath("/admin/clinics")
}

export async function activateClinicAction(clinicId: string) {
  await requireSuperAdmin()
  await db.clinic.update({ where: { id: clinicId }, data: { status: "ACTIVE" } })
  revalidatePath("/admin/clinics")
}

export async function deleteClinicAction(clinicId: string) {
  await requireSuperAdmin()
  await db.clinic.delete({ where: { id: clinicId } })
  revalidatePath("/admin/clinics")
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function updateUserRoleAction(userId: string, role: string) {
  await requireSuperAdmin()
  await db.user.update({ where: { id: userId }, data: { platformRole: role } })
  revalidatePath("/admin/users")
}

export async function deleteUserAction(userId: string) {
  await requireSuperAdmin()
  await db.user.delete({ where: { id: userId } })
  revalidatePath("/admin/users")
}

// ── Admin Credentials ─────────────────────────────────────────────────────────

export async function updateAdminCredentialsAction(formData: FormData) {
  const session = await requireSuperAdmin()

  const newEmail = formData.get("email") as string
  const newPassword = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string
  const currentPassword = formData.get("currentPassword") as string

  const admin = await db.user.findUnique({ where: { id: session.user.id } })
  if (!admin?.passwordHash) return { error: "Admin not found" }

  const valid = await bcrypt.compare(currentPassword, admin.passwordHash)
  if (!valid) return { error: "Current password is incorrect" }

  if (newPassword && newPassword !== confirmPassword) {
    return { error: "New passwords do not match" }
  }

  const updateData: any = {}
  if (newEmail && newEmail !== admin.email) {
    const exists = await db.user.findUnique({ where: { email: newEmail } })
    if (exists && exists.id !== admin.id) return { error: "Email already in use" }
    updateData.email = newEmail
  }
  if (newPassword) {
    updateData.passwordHash = await bcrypt.hash(newPassword, 12)
  }

  if (Object.keys(updateData).length === 0) return { error: "No changes made" }

  await db.user.update({ where: { id: admin.id }, data: updateData })
  revalidatePath("/admin/settings")
  return { success: true }
}
