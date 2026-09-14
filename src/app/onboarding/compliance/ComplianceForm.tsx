"use client"

import { useActionState, useState } from "react"
import { saveComplianceAction } from "@/server/actions/onboarding"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

export function ComplianceForm({ country }: { country: string }) {
  const [state, formAction, pending] = useActionState(saveComplianceAction, null)
  const [invoiceLogo, setInvoiceLogo] = useState("")
  const [isUploading, setIsUploading] = useState(false)

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden input to pass the uploaded URL to the server action */}
      <input type="hidden" name="invoiceLogo" value={invoiceLogo} />
      
      <div className="space-y-6">
        {/* Invoice Branding */}
        <div className="space-y-4">
          <h3 className="text-[15px] font-bold m-0 border-b border-line pb-2">Invoice Branding</h3>
          <div>
            <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">Invoice Logo</label>
            <Input type="file" onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              
              setIsUploading(true)
              try {
                const formData = new FormData()
                formData.append("file", file)
                const res = await fetch("/api/upload", { method: "POST", body: formData })
                if (!res.ok) throw new Error("Upload failed")
                const json = await res.json()
                setInvoiceLogo(json.url)
              } catch (err) {
                alert("Failed to upload logo")
              } finally {
                setIsUploading(false)
              }
            }} disabled={pending || isUploading} accept="image/*" />
            <p className="text-[11px] text-ink-soft mt-1">This will be printed at the top of all generated invoices.</p>
            {invoiceLogo && (
              <div className="mt-2">
                <img src={invoiceLogo} alt="Invoice Logo" className="h-10 object-contain rounded" />
              </div>
            )}
          </div>
        </div>

        {/* Global Fields */}
        <div className="space-y-4">
          <h3 className="text-[15px] font-bold m-0 border-b border-line pb-2">Billing Configurations</h3>
          <div>
            <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">UPI ID / Virtual Payment Address (Optional)</label>
            <Input name="upiId" type="text" placeholder="e.g. clinicname@bank" />
            <p className="text-[11px] text-ink-soft mt-1">Used to generate dynamic QR codes on invoices.</p>
          </div>

        <div>
          <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">Service Accounting Code (SAC)</label>
          <Input name="sacCode" type="text" placeholder="e.g. 999312 for Medical Consultation" />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">HSN Code (Retail Pharmacy)</label>
          <Input name="hsnCode" type="text" placeholder="e.g. 3004" />
        </div>
        </div>

        {/* Region Specific Fields */}
        {country === "US" && (
          <div className="p-4 border border-line rounded-lg bg-paper-raised space-y-4 mt-4">
            <h4 className="text-[13.5px] font-bold m-0">United States Requirements</h4>
            <div>
              <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">EIN (Employer Identification Number)</label>
              <Input name="ein" type="text" placeholder="XX-XXXXXXX" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">NPI (National Provider Identifier) Type 2</label>
              <Input name="npi" type="text" placeholder="10-digit number" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">Taxonomy Code</label>
              <Input name="taxonomyCode" type="text" placeholder="e.g. 207Q00000X" />
            </div>
          </div>
        )}

        {country === "AE" && (
          <div className="p-4 border border-line rounded-lg bg-paper-raised space-y-4 mt-4">
            <h4 className="text-[13.5px] font-bold m-0">UAE Requirements</h4>
            <div>
              <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">TRN (Tax Registration Number)</label>
              <Input name="trn" type="text" placeholder="15-digit number" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">DHA / MOHAP Facility License</label>
              <Input name="dhaLicense" type="text" placeholder="License Number" />
            </div>
          </div>
        )}

        {country === "CA" && (
          <div className="p-4 border border-line rounded-lg bg-paper-raised space-y-4 mt-4">
            <h4 className="text-[13.5px] font-bold m-0">Canada Requirements</h4>
            <div>
              <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">CRA Business Number</label>
              <Input name="cra" type="text" placeholder="9-digit number" />
            </div>
          </div>
        )}

        {country === "IN" && (
          <div className="p-4 border border-line rounded-lg bg-paper-raised space-y-4 mt-4">
            <h4 className="text-[13.5px] font-bold m-0">India Requirements</h4>
            <div>
              <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">GSTIN (Goods and Services Tax Identification Number)</label>
              <Input name="gstin" type="text" placeholder="e.g. 22AAAAA0000A1Z5" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">PAN (Permanent Account Number)</label>
              <Input name="pan" type="text" placeholder="e.g. ABCDE1234F" />
            </div>
          </div>
        )}

        {["ZA", "NG", "KE"].includes(country) && (
          <div className="p-4 border border-line rounded-lg bg-paper-raised space-y-4 mt-4">
            <h4 className="text-[13.5px] font-bold m-0">Regional Medical Board</h4>
            <div>
              <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">Facility Registration Number</label>
              <Input name="medicalBoardReg" type="text" placeholder="Registration ID" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">Tax Identification Number (TIN)</label>
              <Input name="tin" type="text" placeholder="TIN" />
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 flex justify-between">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Continue to Staff"}
        </Button>
      </div>
    </form>
  )
}
