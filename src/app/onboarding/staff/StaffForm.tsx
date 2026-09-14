"use client"

import { useActionState } from "react"
import { saveStaffAction } from "@/server/actions/onboarding"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

export function StaffForm({ userName, userEmail }: { userName: string, userEmail: string }) {
  const [state, formAction, pending] = useActionState(saveStaffAction, null)

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-4">
        <div className="p-4 border border-line rounded-lg bg-paper-raised">
          <p className="text-[13px] text-ink-soft mb-4">
            If you are the primary doctor, you can add yourself here. Otherwise, add a staff member.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">Doctor's Full Name</label>
              <Input name="name" type="text" defaultValue={userName} required />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">Specialty</label>
              <Input name="specialty" type="text" placeholder="e.g. General Practitioner" required />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">Email Address</label>
              <Input name="email" type="email" defaultValue={userEmail} />
            </div>
            
            <div>
              <label className="block text-[13px] font-semibold text-ink-soft mb-1.5">Phone Number</label>
              <Input name="phone" type="text" placeholder="e.g. +1 555-0123" />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 flex justify-between">
        <Button type="submit" variant="ghost" formNoValidate onClick={() => {
            // Set inputs to empty so server action bypasses creation
            const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
            if (nameInput) nameInput.value = "";
        }}>
          Skip for now
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Continue to Plans"}
        </Button>
      </div>
    </form>
  )
}
