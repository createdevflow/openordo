"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createPlan, updatePlan } from "@/server/actions/admin/plans"
import { Check, Info } from "lucide-react"

export function PlanFormClient({ plan }: { plan: any }) {
  const router = useRouter()
  const initialFeatures = plan?.features ? (typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features) : [""]
  const [features, setFeatures] = useState<string[]>(initialFeatures)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    
    const data = {
      name: fd.get("name") as string,
      slug: fd.get("slug") as string,
      description: fd.get("description") as string,
      priceMonthly: parseInt(fd.get("priceMonthly") as string) || 0,
      priceYearly: fd.get("priceYearly") ? parseInt(fd.get("priceYearly") as string) : null,
      currency: fd.get("currency") as string || "INR",
      patientLimit: fd.get("patientLimit") ? parseInt(fd.get("patientLimit") as string) : null,
      doctorLimit: fd.get("doctorLimit") ? parseInt(fd.get("doctorLimit") as string) : null,
      features: JSON.stringify(features.filter(f => f.trim() !== "")),
      isFeatured: fd.get("isFeatured") === "on",
      isActive: fd.get("isActive") === "on",
      isDefaultFree: fd.get("isDefaultFree") === "on",
      sortOrder: parseInt(fd.get("sortOrder") as string) || 0
    }

    const action = plan ? updatePlan(plan.id, data) : createPlan(data)
    toast.promise(action, {
      loading: "Saving plan...",
      success: (res) => {
        if (!res.ok) throw new Error(res.error)
        router.push("/admin/plans")
        router.refresh()
        return "Plan saved successfully"
      },
      error: (err) => err.message || "Failed to save plan"
    })
  }

  return (
    <form className="adm-card" style={{ maxWidth: 800 }} onSubmit={handleSubmit}>
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label className="adm-label">Plan Name</label>
            <input name="name" className="adm-input" defaultValue={plan?.name} required />
          </div>
          <div>
            <label className="adm-label">Slug (internal)</label>
            <input name="slug" className="adm-input" defaultValue={plan?.slug} required />
          </div>
        </div>

        <div>
          <label className="adm-label">Description (optional)</label>
          <input name="description" className="adm-input" defaultValue={plan?.description || ""} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label className="adm-label">Monthly Price (in cents/paise)</label>
            <input name="priceMonthly" type="number" className="adm-input" defaultValue={plan?.priceMonthly} required />
          </div>
          <div>
            <label className="adm-label">Yearly Price (in cents/paise)</label>
            <input name="priceYearly" type="number" className="adm-input" defaultValue={plan?.priceYearly || ""} />
          </div>
          <div>
            <label className="adm-label">Currency</label>
            <input name="currency" className="adm-input" defaultValue={plan?.currency || "INR"} required />
          </div>
        </div>

        {plan && (
          <div style={{ display: "flex", gap: 8, padding: "12px", background: "var(--adm-bg)", borderRadius: 8, fontSize: 13, color: "var(--adm-soft)", alignItems: "flex-start" }}>
            <Info size={16} color="var(--adm-accent)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0 }}>Changing the price creates a new rate for future signups. Existing subscribers keep their current price until they switch plans.</p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label className="adm-label">Patient Limit (leave blank for unlimited)</label>
            <input name="patientLimit" type="number" className="adm-input" defaultValue={plan?.patientLimit || ""} />
          </div>
          <div>
            <label className="adm-label">Doctor Limit (leave blank for unlimited)</label>
            <input name="doctorLimit" type="number" className="adm-input" defaultValue={plan?.doctorLimit || ""} />
          </div>
        </div>

        <div>
          <label className="adm-label">Features (bullet points)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <input 
                  className="adm-input" 
                  value={f} 
                  onChange={(e) => {
                    const newF = [...features]
                    newF[i] = e.target.value
                    setFeatures(newF)
                  }} 
                />
                <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setFeatures(features.filter((_, idx) => idx !== i))}>Remove</button>
              </div>
            ))}
            <button type="button" className="adm-btn adm-btn-ghost" style={{ alignSelf: "flex-start" }} onClick={() => setFeatures([...features, ""])}>+ Add Feature</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, marginTop: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            <input type="checkbox" name="isActive" defaultChecked={plan ? plan.isActive : true} style={{ width: 16, height: 16 }} />
            Active (visible on pricing page)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            <input type="checkbox" name="isFeatured" defaultChecked={plan?.isFeatured} style={{ width: 16, height: 16 }} />
            Featured ("Most Popular")
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            <input type="checkbox" name="isDefaultFree" defaultChecked={plan?.isDefaultFree} style={{ width: 16, height: 16 }} />
            Is Default Free Plan
          </label>
        </div>

        <div>
          <label className="adm-label">Sort Order</label>
          <input name="sortOrder" type="number" className="adm-input" defaultValue={plan?.sortOrder || 0} style={{ width: 100 }} />
        </div>
      </div>
      <div style={{ padding: "16px 24px", borderTop: "1px solid var(--adm-border)", background: "var(--adm-bg)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={() => router.back()}>Cancel</button>
        <button type="submit" className="adm-btn adm-btn-primary">
          <Check size={16} /> Save Plan
        </button>
      </div>
    </form>
  )
}
