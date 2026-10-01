import { db } from "@/lib/db"
import { ClinicsClient } from "./ClinicsClient"

import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Clinics",
}

export default async function AdminClinicsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const resolvedParams = await searchParams
  const initialFilter = resolvedParams?.status === "SUSPENDED" ? "SUSPENDED" : "ALL"
  const clinics = await db.clinic.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      memberships: {
        where: { role: "OWNER" },
        include: { user: { select: { name: true, email: true } } },
        take: 1,
      },
      _count: {
        select: { patients: true, appointments: true, doctors: true }
      },
      subscription: { include: { plan: { select: { name: true } } } }
    }
  })

  const activePromos = await db.promo.findMany({
    where: { isActive: true }
  })

  return <ClinicsClient clinics={clinics} activePromos={activePromos} initialFilter={initialFilter} />
}
