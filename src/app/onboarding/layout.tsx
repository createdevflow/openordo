import * as React from "react"
import { ClipboardList } from "lucide-react"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) {
    return redirect("/login")
  }
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center p-6 md:p-10">
      <div className="w-full max-w-5xl">
        <div className="mb-10 flex items-center gap-[9px] text-[19px] font-bold font-serif text-ink">
          <img src="/openordo_logo.png" alt="OpenORDO Logo" className="h-[36px] w-auto" />
          OpenORDO
        </div>
        <div className="w-full">
          {children}
        </div>
      </div>
    </div>
  )
}
