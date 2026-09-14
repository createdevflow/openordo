import { db } from "@/lib/db"
import { PromotionsClient } from "./PromotionsClient"

export default async function AdminPromotionsPage() {
  const promotions = await db.promo.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      targetPlan: true,
      _count: { select: { redemptions: true } }
    }
  })

  return <PromotionsClient promotions={promotions} />
}
