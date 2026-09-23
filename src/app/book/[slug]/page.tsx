import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { BookingPageLayout } from "./BookingPageLayout"
import "../../dashboard.css"
import { hasActivePlugin } from "@/lib/plugins"

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const clinic = await db.clinic.findUnique({
    where: { slug },
    include: {
      doctors: { orderBy: { name: "asc" } },
    }
  })

  if (!clinic || clinic.status !== "ACTIVE") return notFound()

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

  // Branding values — fall back to clinic defaults when plugin not active
  const accentColor = hasBrandedPlugin && bpc?.accentColor ? bpc.accentColor : "#1E4638"
  const displayName = hasBrandedPlugin && bpc?.displayName ? bpc.displayName : clinic.name
  const tagline      = hasBrandedPlugin ? (bpc?.tagline   ?? "") : ""
  const aboutText    = hasBrandedPlugin ? (bpc?.aboutText ?? "") : ""
  const logoUrl      = hasBrandedPlugin ? (bpc?.logoUrl   ?? "") : ""
  const coverUrl     = hasBrandedPlugin ? (bpc?.coverUrl  ?? "") : ""
  const faviconUrl   = hasBrandedPlugin ? (bpc?.faviconUrl ?? "") : ""
  const showAddress  = bpc?.showAddress ?? true
  const showPhone    = bpc?.showPhone   ?? true
  const showHours    = bpc?.showHours   ?? true

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
    />
  )
}
