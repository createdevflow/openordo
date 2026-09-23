"use server"

import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"

export type BookingPageConfigData = {
  logoUrl?: string | null
  faviconUrl?: string | null
  coverUrl?: string | null
  accentColor?: string
  displayName?: string | null
  tagline?: string | null
  aboutText?: string | null
  showAddress?: boolean
  showPhone?: boolean
  showHours?: boolean
  bookableDoctorIds?: string[] // array; serialized to JSON
  appointmentTypes?: string[]  // array; serialized to JSON
  showPoweredBy?: boolean
  socialLinks?: {
    website?: string
    instagram?: string
    facebook?: string
    twitter?: string
  }
}

/**
 * Fetches the clinic's booking page config, or returns sensible defaults if none exists yet.
 */
export async function getBookingPageConfig(clinicId: string) {
  const config = await db.bookingPageConfig.findUnique({ where: { clinicId } })
  return config
}

/**
 * Upserts the clinic's booking page config.
 * Requires the caller to be authenticated as the clinic owner / admin.
 */
export async function saveBookingPageConfig(data: BookingPageConfigData) {
  const clinicId = await requireClinicId()

  const payload = {
    logoUrl: data.logoUrl ?? null,
    faviconUrl: data.faviconUrl ?? null,
    coverUrl: data.coverUrl ?? null,
    accentColor: data.accentColor ?? "#1E4638",
    displayName: data.displayName ?? null,
    tagline: data.tagline ?? null,
    aboutText: data.aboutText ?? null,
    showAddress: data.showAddress ?? true,
    showPhone: data.showPhone ?? true,
    showHours: data.showHours ?? true,
    bookableDoctorIds: data.bookableDoctorIds ? JSON.stringify(data.bookableDoctorIds) : null,
    appointmentTypes: data.appointmentTypes ? JSON.stringify(data.appointmentTypes) : null,
    showPoweredBy: data.showPoweredBy ?? true,
    socialLinks: data.socialLinks ? JSON.stringify(data.socialLinks) : null,
  }

  // Guard: db.bookingPageConfig won't exist until the Prisma client is regenerated.
  // Stop the dev server → npx prisma generate → npm run dev to fix permanently.
  if (!(db as any).bookingPageConfig) {
    throw new Error("Prisma client is outdated. Stop the dev server, run `npx prisma generate`, then restart.")
  }

  await (db as any).bookingPageConfig.upsert({
    where: { clinicId },
    update: payload,
    create: { clinicId, ...payload },
  })

  revalidatePath("/dashboard/settings")
  // Also revalidate the public booking page for this clinic so the next visit picks up changes
  const clinic = await db.clinic.findUnique({ where: { id: clinicId }, select: { slug: true } })
  if (clinic?.slug) {
    revalidatePath(`/book/${clinic.slug}`)
  }

  return { ok: true }
}
