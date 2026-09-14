import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  console.log("Seeding PlatformFlags...")

  const flags = [
    {
      key: "PUBLIC_REGISTRATION",
      label: "New clinic signups",
      description: "When off, /register shows a 'Signups are temporarily paused' page instead of the form.",
      category: "Access",
      enabled: true,
    },
    {
      key: "PROMOTIONS_MODULE",
      label: "Promotions engine",
      description: "When off, no promo banner or redemption appears anywhere, even if a Promo row is Live.",
      category: "Modules",
      enabled: true,
    },
    {
      key: "STRIPE_CHECKOUT",
      label: "Paid checkout",
      description: "When off, only the default free plan is selectable platform-wide; paid plan buttons show 'Contact us'.",
      category: "Billing",
      enabled: true,
    },
    {
      key: "PATIENT_SELF_EXPORT",
      label: "Clinic data export",
      description: "When off, hides the 'Export clinic data' button in clinic Settings.",
      category: "Modules",
      enabled: true,
    },
    {
      key: "MAINTENANCE_MODE",
      label: "Maintenance mode",
      description: "When on, every non-admin route shows a maintenance page. /admin stays accessible.",
      category: "Platform",
      enabled: false,
    },
  ]

  for (const flag of flags) {
    await db.platformFlag.upsert({
      where: { key: flag.key },
      update: { label: flag.label, description: flag.description, category: flag.category },
      create: flag,
    })
  }

  console.log("Seeding Feature catalog...")

  const features = [
    // Core
    { key: "core.patient_management", name: "Patient management", description: "Add, edit, search patients and medical history", category: "Core", isGloballyEnabled: true },
    { key: "core.appointment_calendar", name: "Appointment calendar", description: "Visual daily/weekly calendar and scheduling", category: "Core", isGloballyEnabled: true },
    { key: "core.doctor_profiles", name: "Doctor profiles", description: "Manage doctor profiles, specialties, and working hours", category: "Core", isGloballyEnabled: true },
    // Scheduling
    { key: "scheduling.online_booking", name: "Online booking page", description: "Public booking link for patients to self-book appointments", category: "Scheduling", isGloballyEnabled: true },
    { key: "scheduling.multi_doctor", name: "Multi-doctor scheduling", description: "Manage calendars across multiple doctors simultaneously", category: "Scheduling", isGloballyEnabled: true },
    { key: "scheduling.waitlist", name: "Waitlist management", description: "Automated waitlist with SMS/email notifications", category: "Scheduling", isGloballyEnabled: true },
    // Billing
    { key: "billing.invoices", name: "Invoicing & billing", description: "Create and send invoices, track payment status", category: "Billing", isGloballyEnabled: true },
    { key: "billing.revenue_reports", name: "Revenue reports", description: "Monthly and annual revenue analytics and export", category: "Billing", isGloballyEnabled: true },
    { key: "billing.insurance", name: "Insurance management", description: "Track and process insurance claims", category: "Billing", isGloballyEnabled: true },
    // Communication
    { key: "communication.reminders", name: "Appointment reminders", description: "Automated SMS and email reminders to patients", category: "Communication", isGloballyEnabled: true },
    { key: "communication.patient_portal", name: "Patient portal", description: "Patients can view their records and upcoming appointments", category: "Communication", isGloballyEnabled: false },
    // Support
    { key: "support.data_export", name: "Data export", description: "Export all clinic data as CSV or PDF", category: "Support", isGloballyEnabled: true },
    { key: "support.api_access", name: "API access", description: "REST API for custom integrations", category: "Support", isGloballyEnabled: false },
  ]

  for (const feature of features) {
    await db.feature.upsert({
      where: { key: feature.key },
      update: { name: feature.name, description: feature.description, category: feature.category },
      create: feature,
    })
  }

  // Ensure default PlanFeature mappings
  const allPlans = await db.plan.findMany()
  const dbFeatures = await db.feature.findMany()
  const featureMap = new Map(dbFeatures.map(f => [f.key, f.id]))

  const starterKeys = ["core.patient_management", "core.appointment_calendar", "core.doctor_profiles"]
  const practiceKeys = [...starterKeys, "scheduling.online_booking", "scheduling.waitlist", "billing.invoices", "communication.reminders"]
  const groupKeys = [...practiceKeys, "scheduling.multi_doctor", "billing.insurance", "billing.revenue_reports", "support.data_export"]

  for (const plan of allPlans) {
    let allowed = starterKeys
    if (plan.slug === "practice") allowed = practiceKeys
    else if (plan.slug === "clinic-group") allowed = groupKeys

    for (const [key, featureId] of featureMap.entries()) {
      await db.planFeature.upsert({
        where: {
          planId_featureId: {
            planId: plan.id,
            featureId: featureId
          }
        },
        update: { included: allowed.includes(key) },
        create: {
          planId: plan.id,
          featureId: featureId,
          included: allowed.includes(key)
        }
      })
    }
  }

  console.log("Seeding plugins...")

  const plugins = [
    {
      slug: "video-consultation",
      name: "Video Consultation",
      tagline: "See patients face-to-face, anywhere in the world.",
      description: "Add live HD video visits to any appointment. Patients join via a secure link — no app download needed. Built on Daily.co for crystal-clear, HIPAA-ready calls.",
      category: "Clinical",
      icon: "Video",
      priceMonthlyINR: 99900,   // ₹999/mo
      priceMonthlyUSD: 1499,    // $14.99/mo
      priceYearlyINR:  899900,  // ₹8,999/yr
      priceYearlyUSD:  12999,   // $129.99/yr
      isActive: true,
      sortOrder: 1,
    },
    {
      slug: "inventory-management",
      name: "Inventory Management",
      tagline: "Never run out of stock — track every vial, strip, and box.",
      description: "Real-time stock tracking with reorder alerts. Log usage against visits, receive low-stock notifications, and generate consumption reports — all without a spreadsheet.",
      category: "Operations",
      icon: "Package",
      priceOneTimeINR: 499900,  // ₹4,999 one-time
      priceOneTimeUSD: 5999,    // $59.99 one-time
      priceMonthlyINR: 49900,   // ₹499/mo
      priceMonthlyUSD: 799,     // $7.99/mo
      isActive: true,
      sortOrder: 2,
    },
    {
      slug: "e-prescriptions",
      name: "E-Prescriptions",
      tagline: "Structured, signed, printable prescriptions in seconds.",
      description: "Replace free-text notes with a guided prescription builder — drug autocomplete, dosage, frequency, and duration rows. Prints as a branded PDF ready for the patient to take to a pharmacy.",
      category: "Clinical",
      icon: "FileSignature",
      priceOneTimeINR: 299900,  // ₹2,999 one-time
      priceOneTimeUSD: 3999,    // $39.99 one-time
      priceMonthlyINR: 29900,   // ₹299/mo
      priceMonthlyUSD: 499,     // $4.99/mo
      priceYearlyINR:  269900,  // ₹2,699/yr
      priceYearlyUSD:  4499,    // $44.99/yr
      isActive: true,
      sortOrder: 3,
    },
  ]

  for (const plugin of plugins) {
    await db.plugin.upsert({
      where: { slug: plugin.slug },
      update: {
        name: plugin.name,
        tagline: plugin.tagline,
        description: plugin.description,
        category: plugin.category,
        icon: plugin.icon,
        priceOneTimeINR: plugin.priceOneTimeINR ?? null,
        priceOneTimeUSD: plugin.priceOneTimeUSD ?? null,
        priceMonthlyINR: plugin.priceMonthlyINR ?? null,
        priceMonthlyUSD: plugin.priceMonthlyUSD ?? null,
        priceYearlyINR: plugin.priceYearlyINR ?? null,
        priceYearlyUSD: plugin.priceYearlyUSD ?? null,
        isActive: plugin.isActive,
        sortOrder: plugin.sortOrder,
      },
      create: plugin,
    })
  }

  console.log("✅ Seed complete")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
