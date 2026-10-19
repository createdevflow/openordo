import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LeadsClient } from "./LeadsClient"

export const metadata = {
  title: "Contact Leads | Admin",
}

export default async function AdminLeadsPage() {
  const session = await auth()
  if (session?.user?.platformRole !== "SUPER_ADMIN") redirect("/")

  const rawLeads = await db.contactLead.findMany({
    orderBy: { createdAt: "desc" }
  })

  // Serialize dates for client component
  const leads = rawLeads.map((l: any) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    message: l.message,
    status: l.status,
    createdAt: l.createdAt.toISOString(),
  }))

  return <LeadsClient leads={leads} />
}
