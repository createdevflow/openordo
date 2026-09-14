import { ClipboardList } from "lucide-react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (session?.user) {
    if (session.user.platformRole === "SUPER_ADMIN" && !session.user.clinicId) {
      return redirect("/admin")
    }
    return redirect("/dashboard")
  }
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="hidden bg-forest p-12 text-white md:flex flex-col justify-between">
        <div className="flex items-center gap-2 font-bold font-serif text-[19px]">
          <img src="/OpenOrdo_Logo_Monochrome.png" alt="OpenORDO Logo" className="h-[36px] w-auto" />
          OpenORDO
        </div>
        <div>
          <div className="font-serif text-[30px] font-medium leading-[1.25] max-w-[24ch]">
            Every patient, every visit, every clinic — kept in one record.
          </div>
          <p className="mt-4 max-w-[34ch] text-[14.5px] leading-[1.6] text-[#CFE0D6]">
            OpenORDO is the day-to-day system for running a clinic: booking appointments, keeping patient charts current, and sending invoices that get paid.
          </p>
        </div>
        <div className="text-[13px] text-[#93A69C]">
          Trusted by dental, general and multi-specialty clinics.
        </div>
      </div>
      <div className="flex items-center justify-center p-10">
        <div className="w-full max-w-[380px]">
          {children}
        </div>
      </div>
    </div>
  )
}
