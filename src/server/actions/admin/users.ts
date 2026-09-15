"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireSuperAdmin, logAudit } from "../admin-base"
import bcrypt from "bcryptjs"

export async function createUser(data: { name: string; email: string; username: string; password?: string; platformRole: string }) {
  try {
    const session = await requireSuperAdmin()
    
    // Check if email or username exists
    const existing = await db.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] }
    })
    
    if (existing) {
      if (existing.email === data.email) return { ok: false, error: "Email already in use" }
      if (existing.username === data.username) return { ok: false, error: "Username already taken" }
    }
    
    const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : null
    
    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        username: data.username,
        passwordHash,
        platformRole: data.platformRole,
        status: "ACTIVE"
      }
    })
    
    await logAudit(session.user.id!, "CREATE_USER", "User", user.id)
    revalidatePath("/admin/users")
    return { ok: true, user }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function changeUserPassword(userId: string, newPassword: string) {
  try {
    const session = await requireSuperAdmin()
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await db.user.update({ where: { id: userId }, data: { passwordHash } })
    await logAudit(session.user.id!, "CHANGE_USER_PASSWORD", "User", userId)
    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${userId}`)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function banUser(userId: string) {
  try {
    const session = await requireSuperAdmin()
    await db.user.update({ where: { id: userId }, data: { status: "BANNED" } })
    await logAudit(session.user.id!, "BAN_USER", "User", userId)
    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${userId}`)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function unbanUser(userId: string) {
  try {
    const session = await requireSuperAdmin()
    await db.user.update({ where: { id: userId }, data: { status: "ACTIVE" } })
    await logAudit(session.user.id!, "UNBAN_USER", "User", userId)
    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${userId}`)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function softDeleteUser(userId: string) {
  try {
    const session = await requireSuperAdmin()
    await db.user.update({ 
      where: { id: userId }, 
      data: { status: "SOFT_DELETED", deletedAt: new Date() } 
    })
    await logAudit(session.user.id!, "SOFT_DELETE_USER", "User", userId)
    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${userId}`)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function restoreUser(userId: string) {
  try {
    const session = await requireSuperAdmin()
    await db.user.update({ 
      where: { id: userId }, 
      data: { status: "ACTIVE", deletedAt: null } 
    })
    await logAudit(session.user.id!, "RESTORE_USER", "User", userId)
    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${userId}`)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function hardDeleteUser(userId: string) {
  try {
    const session = await requireSuperAdmin()
    await db.user.delete({ where: { id: userId } })
    await logAudit(session.user.id!, "HARD_DELETE_USER", "User", userId)
    revalidatePath("/admin/users")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}
