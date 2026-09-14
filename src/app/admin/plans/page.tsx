import { db } from "@/lib/db"
import { PlansClient } from "./PlansClient"

export default async function AdminPlansPage() {
  const plans = await db.plan.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } }
    }
  })

  return <PlansClient plans={plans} />
}
