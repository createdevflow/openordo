import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  const plans = await db.plan.findMany()
  const features = await db.feature.findMany()
  const featureMap = new Map(features.map(f => [f.key, f.id]))

  const starterFeatures = [
    "core.patient_management",
    "core.appointment_calendar",
    "core.doctor_profiles"
  ]

  const practiceFeatures = [
    "core.patient_management",
    "core.appointment_calendar",
    "core.doctor_profiles",
    "scheduling.online_booking",
    "scheduling.waitlist",
    "billing.invoices",
    "communication.reminders"
  ]

  const clinicGroupFeatures = [
    "core.patient_management",
    "core.appointment_calendar",
    "core.doctor_profiles",
    "scheduling.online_booking",
    "scheduling.multi_doctor",
    "scheduling.waitlist",
    "billing.invoices",
    "billing.revenue_reports",
    "billing.insurance",
    "communication.reminders",
    "support.data_export"
  ]

  for (const plan of plans) {
    let allowedKeys: string[] = []
    if (plan.slug === "starter") allowedKeys = starterFeatures
    else if (plan.slug === "practice") allowedKeys = practiceFeatures
    else if (plan.slug === "clinic-group") allowedKeys = clinicGroupFeatures

    console.log(`Configuring plan: ${plan.name} (${plan.slug}) with ${allowedKeys.length} allowed features`)

    await db.planFeature.deleteMany({ where: { planId: plan.id } })

    for (const [key, featureId] of featureMap.entries()) {
      const included = allowedKeys.includes(key)
      await db.planFeature.create({
        data: {
          planId: plan.id,
          featureId: featureId,
          included: included
        }
      })
    }
  }

  // Also ensure Riverside clinic has a subscription to Starter if missing
  const riverside = await db.clinic.findFirst({
    where: { slug: "riverside" },
    include: { subscription: true }
  })
  if (riverside && !riverside.subscription) {
    const starterPlan = plans.find(p => p.slug === "starter")
    if (starterPlan) {
      await db.subscription.create({
        data: {
          clinicId: riverside.id,
          planId: starterPlan.id,
          status: "ACTIVE"
        }
      })
      console.log("Assigned Starter subscription to Riverside clinic")
    }
  }

  console.log("PlanFeatures and subscriptions synchronized successfully!")
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
