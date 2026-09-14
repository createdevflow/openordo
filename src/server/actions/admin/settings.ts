"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireSuperAdmin, logAudit } from "../admin-base"
import bcrypt from "bcrypt"

export async function updateAdminCredentialsAction(formData: FormData) {
  try {
    const session = await requireSuperAdmin()

    const newEmail = formData.get("email") as string
    const newPassword = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string
    const currentPassword = formData.get("currentPassword") as string

    const admin = await db.user.findUnique({ where: { id: session.user.id } })
    if (!admin?.passwordHash) return { ok: false, error: "Admin not found" }

    const valid = await bcrypt.compare(currentPassword, admin.passwordHash)
    if (!valid) return { ok: false, error: "Current password is incorrect" }

    if (newPassword && newPassword !== confirmPassword) {
      return { ok: false, error: "New passwords do not match" }
    }

    const updateData: any = {}
    if (newEmail && newEmail !== admin.email) {
      const exists = await db.user.findUnique({ where: { email: newEmail } })
      if (exists && exists.id !== admin.id) return { ok: false, error: "Email already in use" }
      updateData.email = newEmail
    }
    if (newPassword) {
      updateData.passwordHash = await bcrypt.hash(newPassword, 12)
    }

    if (Object.keys(updateData).length === 0) return { ok: false, error: "No changes made" }

    await db.user.update({ where: { id: admin.id }, data: updateData })
    await logAudit(session.user.id!, "UPDATE_CREDENTIALS", "User", admin.id)
    revalidatePath("/admin/settings")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

// Alias for SettingsShell
export async function updateAdminCredentials({
  email, currentPassword, newPassword
}: {
  email: string; currentPassword: string; newPassword?: string
}) {
  const fakeFormData = new FormData()
  fakeFormData.set("email", email)
  fakeFormData.set("currentPassword", currentPassword)
  if (newPassword) {
    fakeFormData.set("password", newPassword)
    fakeFormData.set("confirmPassword", newPassword)
  }
  return updateAdminCredentialsAction(fakeFormData)
}
