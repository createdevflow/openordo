import { db } from "@/lib/db"
import { PlanBuilderClient } from "./PlanBuilderClient"

export default async function AdminPlanFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [features, plan, planFeatures] = await Promise.all([
    db.feature.findMany({
      where: { isGloballyEnabled: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    id !== "new" ? db.plan.findUnique({ where: { id } }) : Promise.resolve(null),
    id !== "new"
      ? db.planFeature.findMany({ where: { planId: id }, include: { feature: true } })
      : Promise.resolve([]),
  ])

  const includedFeatureIds = new Set(
    planFeatures.filter((pf: any) => pf.included).map((pf: any) => pf.featureId)
  )

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-page-title">{plan ? `Edit: ${plan.name}` : "New Plan"}</h1>
      </div>
      <PlanBuilderClient
        plan={plan}
        allFeatures={features}
        includedFeatureIds={Array.from(includedFeatureIds)}
      />
    </div>
  )
}
