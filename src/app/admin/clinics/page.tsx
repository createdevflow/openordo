import { db } from "@/lib/db"
import { ClinicsClient } from "./ClinicsClient"

export default async function AdminClinicsPage() {
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

  return <ClinicsClient clinics={clinics} activePromos={activePromos} />
}
