import { db } from "@/lib/db"
import { PaymentsClient } from "./PaymentsClient"

export default async function AdminPaymentsPage() {
  const payments = await db.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      clinic: { select: { id: true, name: true, slug: true } },
    },
  })

  return <PaymentsClient payments={payments} />
}
