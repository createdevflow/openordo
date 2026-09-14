import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { hasFeature, getClinicSubscriptionDetails } from "@/lib/features"
import { FeatureGate } from "@/components/ui/FeatureGate"
import { BillingClient } from "./BillingClient"

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ action?: string, patientId?: string }> }) {
  const clinicId = await requireClinicId()
  const resolvedParams = await searchParams

  if (!(await hasFeature(clinicId, "billing.invoices"))) {
    return <FeatureGate featureName="Invoicing & Billing" />
  }

  const [invoices, patients, clinic, planDetails] = await Promise.all([
    db.invoice.findMany({ where: { clinicId } }),
    db.patient.findMany({ where: { clinicId }, orderBy: { name: 'asc' } }),
    db.clinic.findUnique({ where: { id: clinicId } }),
    getClinicSubscriptionDetails(clinicId)
  ])

  return (
    <BillingClient 
      invoices={invoices}
      patients={patients}
      clinic={clinic}
      hasRevenueReports={planDetails.activeFeatures.includes("billing.revenue_reports")}
      hasInsurance={planDetails.activeFeatures.includes("billing.insurance")}
      planName={planDetails.planName}
      initialAction={resolvedParams?.action}
      initialPatientId={resolvedParams?.patientId}
    />
  )
}
