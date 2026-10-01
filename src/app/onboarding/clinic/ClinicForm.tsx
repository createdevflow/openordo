"use client"

import { useActionState, useState } from "react"
import { createClinicAction } from "@/server/actions/onboarding"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"

export function ClinicForm({ activeCountries }: { activeCountries: any[] }) {
  const [state, formAction, pending] = useActionState(createClinicAction, null)
  const [selectedCountryCode, setSelectedCountryCode] = useState(activeCountries[0]?.countryCode || "US")

  const selectedCountry = activeCountries.find(c => c.countryCode === selectedCountryCode)

  return (
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
        <Select 
          name="country" 
          required 
          value={selectedCountryCode}
          onChange={(e) => setSelectedCountryCode(e.target.value)}
        >
          {activeCountries.map(c => (
            <option key={c.countryCode} value={c.countryCode}>{c.countryName}</option>
          ))}
        </Select>
      </div>

      {selectedCountry?.calculationMode === "SPLIT_BY_SUPPLY_REGION" && (
        <div>
          <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">State / Region</label>
          <Input name="region" type="text" placeholder="e.g. Maharashtra" required />
          <p className="text-[12px] text-ink-soft mt-1">Required for accurate tax calculation.</p>
        </div>
      )}

      {selectedCountry?.taxIdLabel && (
        <div>
          <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">{selectedCountry.taxIdLabel} (Optional)</label>
          <Input name="taxId" type="text" placeholder={`e.g. your ${selectedCountry.taxIdLabel}`} />
        </div>
      )}

      <div className="pt-4 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Continue"}
        </Button>
      </div>
    </form>
  )
}
