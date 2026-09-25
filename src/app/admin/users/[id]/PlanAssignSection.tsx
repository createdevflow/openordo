"use client"

import { useState } from "react"
import { adminAssignPlan } from "@/server/actions/admin/users"
import { toast } from "sonner"
import { CreditCard } from "lucide-react"

interface PlanAssignSectionProps {
  plans: any[]
  memberships: any[]
}

export function PlanAssignSection({ plans, memberships }: PlanAssignSectionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedClinic, setSelectedClinic] = useState(memberships[0]?.clinicId || "")
  const [selectedPlan, setSelectedPlan] = useState(
    memberships[0]?.clinic?.subscription?.planId || plans.find(p => p.isDefaultFree)?.id || ""
  )
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    memberships[0]?.clinic?.subscription?.billingCycle || "monthly"
  )

  if (memberships.length === 0) return null

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClinic || !selectedPlan) return

    setIsSubmitting(true)
    try {
      const res = await adminAssignPlan(selectedClinic, selectedPlan, billingCycle)
      if (res.ok) {
        toast.success(`Plan updated to ${res.planName}`)
      } else {
        toast.error(res.error || "Failed to assign plan")
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update defaults when clinic changes
  const handleClinicChange = (clinicId: string) => {
    setSelectedClinic(clinicId)
    const mem = memberships.find(m => m.clinicId === clinicId)
    if (mem?.clinic?.subscription?.planId) {
      setSelectedPlan(mem.clinic.subscription.planId)
      setBillingCycle(mem.clinic.subscription.billingCycle || "monthly")
    }
  }

  return (
    <div className="adm-card" style={{ marginTop: 20 }}>
      <div className="adm-card-head">
        <div className="adm-card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CreditCard size={16} style={{ color: "var(--adm-muted)" }} /> 
          Assign Plan
        </div>
      </div>
      <div style={{ padding: 20 }}>
        <form onSubmit={handleAssignPlan} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 500 }}>
          
          {memberships.length > 1 && (
            <div>
              <label className="adm-label">Select Clinic</label>
              <select className="adm-select" value={selectedClinic} onChange={(e) => handleClinicChange(e.target.value)}>
                {memberships.map(m => (
                  <option key={m.clinicId} value={m.clinicId}>{m.clinic.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="adm-label">Choose Plan</label>
            <select className="adm-select" value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
              <option value="" disabled>Select a plan...</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.priceMonthlyInr ? `(₹${(p.priceMonthlyInr / 100).toFixed(0)}/mo)` : "(Free)"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="adm-label">Billing Cycle</label>
            <div style={{ display: "flex", gap: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input type="radio" name="billingCycle" checked={billingCycle === "monthly"} onChange={() => setBillingCycle("monthly")} />
                Monthly
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input type="radio" name="billingCycle" checked={billingCycle === "yearly"} onChange={() => setBillingCycle("yearly")} />
                Yearly
              </label>
            </div>
          </div>

          <div>
            <button type="submit" className="adm-btn adm-btn-primary" disabled={isSubmitting || !selectedClinic || !selectedPlan}>
              {isSubmitting ? "Assigning..." : "Assign Plan"}
            </button>
            <p style={{ fontSize: 12, color: "var(--adm-muted)", marginTop: 8 }}>
              This will forcefully activate the plan and bypass payment verification. Any existing active Razorpay subscription link for this clinic will be cleared.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
