import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { BookingPageLayout } from "./BookingPageLayout"
import "../../dashboard.css"
import { hasActivePlugin } from "@/lib/plugins"
import { hasFeature, canAcceptBooking } from "@/lib/features"
import { getFileUrl } from "@/lib/file-utils"
import { parseSlotCapacityConfig } from "@/lib/slot-capacity"
import { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const clinic = await db.clinic.findUnique({
    where: { slug }
  })
  if (!clinic) return { title: "Book Appointment" }

  const bpc: any = await (async () => {
    try {
      return await (db as any).bookingPageConfig?.findUnique({ where: { clinicId: clinic.id } }) ?? null
    } catch { return null }
  })()

  const hasBrandedPlugin = await hasActivePlugin(clinic.id, "branded-booking-page").catch(() => false)
  const displayName = (hasBrandedPlugin && bpc?.displayName) ? bpc.displayName : clinic.name
  const favicon = (hasBrandedPlugin && bpc?.faviconUrl) ? getFileUrl(bpc.faviconUrl) : "/favicon.ico"

  return {
    title: `${displayName} — Book an Appointment`,
    description: (hasBrandedPlugin && bpc?.tagline) ? bpc.tagline : `Book an appointment with ${displayName}. Online scheduling portal.`,
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon,
    }
  }
}

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const clinic = await db.clinic.findUnique({
    where: { slug },
    include: {
      doctors: { orderBy: { name: "asc" } },
    }
  })

  if (!clinic || clinic.status !== "ACTIVE") return notFound()

  const [isBookingEnabled, bookingStatus] = await Promise.all([
    hasFeature(clinic.id, "scheduling.online_booking").catch(() => false),
    canAcceptBooking(clinic.id).catch(() => ({ allowed: true, current: 0, effectiveLimit: null, featureDisabled: false, overLimit: false, message: undefined as string | undefined })),
  ])
  const isBookingLimitReached = !bookingStatus.allowed && !bookingStatus.featureDisabled

  // Guard: bookingPageConfig relation not available until Prisma client is regenerated.
  const bpc: any = await (async () => {
    try {
      return await (db as any).bookingPageConfig?.findUnique({ where: { clinicId: clinic.id } }) ?? null
    } catch { return null }
  })()

  const hasBrandedPlugin = await hasActivePlugin(clinic.id, "branded-booking-page").catch(() => false)

  // Server-side badge gate
  const showBadge = !hasBrandedPlugin || (bpc?.showPoweredBy ?? true)

  // Parse JSON fields
  let bookableDoctorIds: string[] | null = null
  let appointmentTypes: string[] | null = null
  let socialLinks: Record<string, string> = {}
  if (bpc) {
    try { bookableDoctorIds = bpc.bookableDoctorIds ? JSON.parse(bpc.bookableDoctorIds) : null } catch {}
    try { appointmentTypes = bpc.appointmentTypes ? JSON.parse(bpc.appointmentTypes) : null } catch {}
    try { socialLinks = bpc.socialLinks ? JSON.parse(bpc.socialLinks) : {} } catch {}
  }

  const bookableDoctors = bookableDoctorIds
    ? clinic.doctors.filter(d => bookableDoctorIds!.includes(d.id))
    : clinic.doctors

  // Branding values — resolved via getFileUrl for public access
  const accentColor = hasBrandedPlugin && bpc?.accentColor ? bpc.accentColor : "#1E4638"
  const displayName = hasBrandedPlugin && bpc?.displayName ? bpc.displayName : clinic.name
  const tagline      = hasBrandedPlugin ? (bpc?.tagline   ?? "") : ""
  const aboutText    = hasBrandedPlugin ? (bpc?.aboutText ?? "") : ""
  const logoUrl      = hasBrandedPlugin && bpc?.logoUrl   ? getFileUrl(bpc.logoUrl) : ""
  const coverUrl     = hasBrandedPlugin && bpc?.coverUrl  ? getFileUrl(bpc.coverUrl) : ""
  const faviconUrl   = hasBrandedPlugin && bpc?.faviconUrl ? getFileUrl(bpc.faviconUrl) : ""
  const showAddress  = bpc?.showAddress ?? true
  const showPhone    = bpc?.showPhone   ?? true
  const showHours    = bpc?.showHours   ?? true

  const slotCapacityConfig = parseSlotCapacityConfig(clinic.billingConfig)

  return (
    <BookingPageLayout
      clinicId={clinic.id}
      clinicName={clinic.name}
      clinicAddress={clinic.address ?? ""}
      clinicPhone={clinic.phone ?? ""}
      clinicOpenTime={clinic.openTime ?? ""}
      clinicCloseTime={clinic.closeTime ?? ""}
      doctors={bookableDoctors}
      appointmentTypes={appointmentTypes ?? []}
      accentColor={accentColor}
      displayName={displayName}
      tagline={tagline}
      aboutText={aboutText}
      logoUrl={logoUrl}
      coverUrl={coverUrl}
      faviconUrl={faviconUrl}
      showAddress={showAddress}
      showPhone={showPhone}
      showHours={showHours}
      socialLinks={socialLinks}
      showBadge={showBadge}
      isBookingEnabled={isBookingEnabled}
      isBookingLimitReached={isBookingLimitReached}
      bookingLimitMessage={bookingStatus.message || ""}
      slotCapacityConfig={slotCapacityConfig}
    />
  )
}
