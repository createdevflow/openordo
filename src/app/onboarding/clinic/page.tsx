"use client"

import { useActionState } from "react"
import { createClinicAction } from "@/server/actions/onboarding"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"

export default function OnboardingClinicPage() {
  const [state, formAction, pending] = useActionState(createClinicAction, null)

  return (
    <div>
      <div className="border-b border-line px-8 py-6 bg-paper">
        <h2 className="text-[21px] font-bold m-0">Set up your clinic</h2>
        <p className="text-[14.5px] text-ink-soft m-0 mt-1">
          Tell us about your practice. You can change this later.
        </p>
      </div>

      <div className="p-8">
        <form action={formAction} className="space-y-6">
          {state?.error && (
            <div className="bg-coral-soft text-coral p-3 rounded-md text-[13px] font-medium">
              {state.error}
            </div>
          )}
          
          <div>
            <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">Clinic Name</label>
            <Input name="name" type="text" placeholder="e.g. Riverside Family Practice" required />
          </div>
          
          <div>
            <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">Specialty / Type</label>
            <Select name="type" required>
              <option value="General Practice">General Practice</option>
              <option value="Dental">Dental</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="Dermatology">Dermatology</option>
              <option value="Other">Other Specialty</option>
            </Select>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">Country</label>
            <Select name="country" required defaultValue="US">
              <option value="US">🇺🇸 United States</option>
              <option value="CA">🇨🇦 Canada</option>
              <option value="AE">🇦🇪 United Arab Emirates</option>
              <option value="IN">🇮🇳 India</option>
              <option value="ZA">🇿🇦 South Africa</option>
              <option value="NG">🇳🇬 Nigeria</option>
              <option value="KE">🇰🇪 Kenya</option>
              <option value="Other">🌍 Other / International</option>
            </Select>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Continue"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
