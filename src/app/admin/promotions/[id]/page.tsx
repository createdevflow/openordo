import { db } from "@/lib/db"
import { PromoFormClient } from "./PromoFormClient"

export default async function AdminPromoFormPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  let promo = null
  if (resolvedParams.id !== "new") {
    promo = await db.promo.findUnique({ where: { id: resolvedParams.id } })
  }

  const rawPlans = await db.plan.findMany({
    where: { isActive: true, isDefaultFree: false },
    orderBy: { sortOrder: 'asc' },
    include: {
      planFeatures: {
        where: { included: true },
        include: { feature: true }
      }
    }
  })

  const plans = rawPlans.map(p => {
    let customBullets: string[] = []
    try {
      if (p.features) {
        customBullets = JSON.parse(p.features)
      }
    } catch {}

    const catalogFeatures = (p.planFeatures || [])
      .filter(pf => pf.feature?.isGloballyEnabled)
      .map(pf => pf.feature.name)

    let displayFeatures: string[] = []
    if (customBullets.length > 0) {
      displayFeatures = customBullets
    } else {
      displayFeatures = catalogFeatures
    }

    return {
      ...p,
      featureList: displayFeatures
    }
  })

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-page-title">{promo ? "Edit Promo" : "Create Promo"}</h1>
      </div>
      <PromoFormClient promo={promo} plans={plans} />
    </div>
  )
}
