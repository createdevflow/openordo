"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

export async function saveGlobalSettings(settings: Record<string, string>) {
  const session = await auth()
  if (session?.user?.platformRole !== "SUPER_ADMIN") {
    throw new Error("Unauthorized")
  }

  // Use a transaction to upsert all settings
  const upserts = Object.entries(settings).map(([key, value]) => {
    return db.globalSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  })

  await db.$transaction(upserts)

  revalidatePath("/admin/settings")
  revalidatePath("/") // Revalidate layout for SEO tags
  return { success: true }
}
