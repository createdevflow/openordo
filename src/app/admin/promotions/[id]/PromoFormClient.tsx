"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createPromo, updatePromo } from "@/server/actions/admin/promotions"
import { Check } from "lucide-react"
import { OnboardingPromoCard } from "@/app/onboarding/plan/OnboardingPromoCard"

export function PromoFormClient({ promo, plans }: { promo: any, plans: any[] }) {
  const router = useRouter()
  
  const [headline, setHeadline] = useState(promo?.headline || "Try Practice free for 14 days")
  const [subtext, setSubtext] = useState(promo?.subtext || "No card required. Automatically moves to Starter after your trial.")
  const [targetPlanId, setTargetPlanId] = useState(promo?.targetPlanId || (plans.length > 0 ? plans[0].id : ""))

  const targetPlan = plans.find(p => p.id === targetPlanId)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    
    const data = {
      name: fd.get("name") as string,
      targetPlanId: fd.get("targetPlanId") as string,
      durationDays: parseInt(fd.get("durationDays") as string) || 14,
      eligibility: fd.get("eligibility") as string,
      startsAt: fd.get("startsAt") ? new Date(fd.get("startsAt") as string) : null,
      endsAt: fd.get("endsAt") ? new Date(fd.get("endsAt") as string) : null,
      redemptionLimit: fd.get("redemptionLimit") ? parseInt(fd.get("redemptionLimit") as string) : null,
      headline: fd.get("headline") as string,
      subtext: fd.get("subtext") as string,
      isActive: fd.get("isActive") === "on",
    }

    const action = promo ? updatePromo(promo.id, data) : createPromo(data)
    toast.promise(action, {
      loading: "Saving promo...",
      success: (res) => {
        if (!res.ok) throw new Error(res.error)
        router.push("/admin/promotions")
        router.refresh()
        return "Promo saved successfully"
      },
      error: (err) => err.message || "Failed to save promo"
    })
  }

  return (
    <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
      <form className="adm-card" style={{ flex: 1 }} onSubmit={handleSubmit}>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          
          <div>
            <label className="adm-label">Internal Name</label>
            <input name="name" className="adm-input" defaultValue={promo?.name} placeholder="e.g. Launch week — Practice free trial" required />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label className="adm-label">Target Plan</label>
              <select name="targetPlanId" className="adm-input" value={targetPlanId} onChange={e => setTargetPlanId(e.target.value)} required>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="adm-label">Duration (Days)</label>
              <input name="durationDays" type="number" className="adm-input" defaultValue={promo?.durationDays || 14} required />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label className="adm-label">Eligibility</label>
              <select name="eligibility" className="adm-input" defaultValue={promo?.eligibility || "NEW_CLINICS_ONLY"}>
                <option value="NEW_CLINICS_ONLY">New clinics only (onboarding)</option>
                <option value="ALL_CLINICS">All clinics (including existing)</option>
              </select>
            </div>
            <div>
              <label className="adm-label">Redemption Limit</label>
              <input name="redemptionLimit" type="number" className="adm-input" defaultValue={promo?.redemptionLimit || ""} placeholder="Leave blank for unlimited" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label className="adm-label">Start Date (Optional)</label>
              <input name="startsAt" type="datetime-local" className="adm-input" defaultValue={promo?.startsAt ? new Date(promo.startsAt).toISOString().slice(0, 16) : ""} />
            </div>
            <div>
              <label className="adm-label">End Date (Optional)</label>
              <input name="endsAt" type="datetime-local" className="adm-input" defaultValue={promo?.endsAt ? new Date(promo.endsAt).toISOString().slice(0, 16) : ""} />
            </div>
          </div>

          <div>
            <label className="adm-label">Headline (Customer Facing)</label>
            <input name="headline" className="adm-input" value={headline} onChange={e => setHeadline(e.target.value)} required />
          </div>

          <div>
            <label className="adm-label">Subtext (Customer Facing)</label>
            <input name="subtext" className="adm-input" value={subtext} onChange={e => setSubtext(e.target.value)} />
          </div>

          <div style={{ marginTop: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              <input type="checkbox" name="isActive" defaultChecked={promo ? promo.isActive : true} style={{ width: 16, height: 16 }} />
              Active
            </label>
            <p style={{ fontSize: 13, color: "var(--adm-soft)", marginTop: 6, marginLeft: 24, marginBottom: 0 }}>
              If you activate a NEW_CLINICS_ONLY promo, any currently active one will be automatically paused.
            </p>
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--adm-border)", background: "var(--adm-bg)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button type="button" className="adm-btn adm-btn-ghost" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="adm-btn adm-btn-primary">
            <Check size={16} /> Save Promo
          </button>
        </div>
      </form>

      <div style={{ width: 440, flexShrink: 0 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "var(--adm-soft)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Live Preview</h3>
        {targetPlan && (
          <div style={{ pointerEvents: "none" }}>
            <OnboardingPromoCard 
              promo={{ id: "preview", headline, subtext, durationDays: 14, targetPlanId }} 
              targetPlan={targetPlan} 
            />
          </div>
        )}
      </div>
    </div>
  )
}
