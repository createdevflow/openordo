import { auth } from "@/lib/auth"
import { requireClinicId } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { getClinicSubscriptionDetails } from "@/lib/features"
import { DashboardShell } from "@/components/DashboardShell"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { ViewTitle } from "@/components/ViewTitle"
import "../dashboard.css"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    template: "%s | OpenORDO Clinic",
    default: "OpenORDO Clinic",
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const clinicId = await requireClinicId()

  if (session?.user?.id) {
    // Consent is now enforced globally in requireClinicId
  }

  const clinic = await db.clinic.findUnique({
    where: { id: clinicId }
  })

  if (!clinic) return redirect("/onboarding/clinic")

  const planDetails = await getClinicSubscriptionDetails(clinicId)

  const pendingBookings = await db.bookingRequest.count({
    where: { clinicId, status: "PENDING" }
  })

  const recentBookings = await db.bookingRequest.findMany({
    where: { clinicId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 4
  })

  const pendingDataRequests = await db.dataExportRequest.count({
    where: { clinicId, status: "PENDING" }
  })

  const recentDataRequests = await db.dataExportRequest.findMany({
    where: { clinicId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: { patientAccount: { select: { name: true } } },
    take: 4
  })

  // Fetch active plugin slugs for nav gating
  const activePluginRows = await db.clinicPlugin.findMany({
    where: { clinicId, status: "ACTIVE", isEnabled: true },
    include: { plugin: { select: { slug: true } } },
  })
  const activePlugins = activePluginRows.map((cp) => cp.plugin.slug)

  const userInitials = session?.user?.name
    ? session.user.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
    : "U"

  const cookieStore = await cookies()
  const isCollapsed = cookieStore.get("cw_sidebar_collapsed")?.value === "true"

  const feedbackFlag = await db.platformFlag.findUnique({
    where: { key: "BETA_FEEDBACK_WIDGET" }
  })

  return (
    <DashboardShell 
      clinicName={clinic.name} 
      userName={session?.user?.name || ""}
      userInitials={userInitials}
      viewTitle={<ViewTitle />}
      planName={`${planDetails.planName} plan`}
      pendingBookings={pendingBookings}
      recentBookings={recentBookings}
      pendingDataRequests={pendingDataRequests}
      recentDataRequests={recentDataRequests}
      activeFeatures={planDetails.activeFeatures}
      activePlugins={activePlugins}
      defaultCollapsed={isCollapsed}
      promoExpiresAt={planDetails.promoExpiresAt ? planDetails.promoExpiresAt.toISOString() : null}
      clinicStatus={clinic.status}
      clinicId={clinicId}
      showFeedbackWidget={feedbackFlag?.enabled ?? false}
    >
      {children}
    </DashboardShell>
  )
}
