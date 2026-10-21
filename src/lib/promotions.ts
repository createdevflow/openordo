import { db } from "@/lib/db"

export function isPromoActive(p: {
  isActive?: boolean | null
  startsAt?: Date | string | null
  endsAt?: Date | string | null
  redemptionLimit?: number | null
  redemptionCount?: number | null
} | null | undefined): boolean {
  if (!p || !p.isActive) return false
  const now = new Date()
  if (p.startsAt && new Date(p.startsAt) > now) return false
  if (p.endsAt && new Date(p.endsAt) <= now) return false
  if (p.redemptionLimit && (p.redemptionCount ?? 0) >= p.redemptionLimit) return false
  return true
}

export async function getActiveNewClinicPromo() {
  const now = new Date()

  try {
    // Lazily mark any promos whose endsAt has passed as isActive: false
    await db.promo.updateMany({
      where: {
        isActive: true,
        endsAt: { lt: now }
      },
      data: {
        isActive: false
      }
    }).catch(() => {})

    const promo = await db.promo.findFirst({
      where: {
        isActive: true,
        OR: [
          { eligibility: "NEW_CLINICS_ONLY" },
          { eligibility: "ALL_CLINICS" }
        ],
        AND: [
          {
            OR: [
              { startsAt: null },
              { startsAt: { lte: now } }
            ]
          },
          {
            OR: [
              { endsAt: null },
              { endsAt: { gt: now } }
            ]
          }
        ]
      },
      include: {
        targetPlan: {
          include: {
            planFeatures: {
              where: { included: true },
              include: { feature: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    if (!promo) return null

    if (promo.redemptionLimit && promo.redemptionCount >= promo.redemptionLimit) {
      return null
    }

    return promo
  } catch (error) {
    console.error("Failed to fetch active promo from DB:", error)
    return null
  }
}
