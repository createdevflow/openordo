import * as React from "react"
import Link from "next/link"
import { ClipboardList, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { MarketingMobileNav } from "@/components/ui/MarketingMobileNav"
import "../dashboard.css"
import { auth } from "@/lib/auth"

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <nav className="sticky top-0 z-40 border-b border-line bg-[#F1F0EA]/90 backdrop-blur-[10px]">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-7 py-[18px]">
          <Link href="/" className="flex items-center gap-[9px] text-[19px] font-bold font-serif text-ink">
            <img src="/openordo_logo.png" alt="OpenORDO Logo" className="h-[36px] w-auto" />
            OpenORDO
          </Link>
          <div className="hidden md:flex items-center gap-[30px]">
            <Link href="/features" className="text-[14.5px] font-medium text-ink-soft hover:text-ink">Features</Link>
            <Link href="/workflow" className="text-[14.5px] font-medium text-ink-soft hover:text-ink">How it works</Link>
            <Link href="/pricing" className="text-[14.5px] font-medium text-ink-soft hover:text-ink">Pricing</Link>
            <Link href="/addons" className="text-[14.5px] font-medium text-ink-soft hover:text-ink">Add-ons</Link>
            
            <div className="relative group">
              <button className="text-[14.5px] font-medium text-ink-soft hover:text-ink flex items-center gap-1 cursor-pointer">
                Legal & Contact <ChevronDown size={14} className="mt-[1px]" />
              </button>
              <div className="absolute top-full right-0 mt-2 w-48 bg-paper border border-line rounded-[8px] shadow-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col p-1.5 z-50">
                <Link href="/contact" className="px-3 py-2 text-[13.5px] text-ink font-medium hover:bg-paper-raised rounded-md">Contact Us</Link>
                <div className="h-px bg-line my-1"></div>
                <Link href="/legal/terms" className="px-3 py-2 text-[13.5px] text-ink-soft hover:text-ink hover:bg-paper-raised rounded-md">Terms of Service</Link>
                <Link href="/legal/privacy" className="px-3 py-2 text-[13.5px] text-ink-soft hover:text-ink hover:bg-paper-raised rounded-md">Privacy Policy</Link>
                <Link href="/legal/dpa" className="px-3 py-2 text-[13.5px] text-ink-soft hover:text-ink hover:bg-paper-raised rounded-md">Data Processing (DPA)</Link>
                <Link href="/legal/security" className="px-3 py-2 text-[13.5px] text-ink-soft hover:text-ink hover:bg-paper-raised rounded-md">Security & Trust</Link>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2.5">
            {session ? (
              <Link href={session.user?.platformRole === "SUPER_ADMIN" ? "/admin" : "/dashboard"} tabIndex={-1}>
                <Button size="sm">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" tabIndex={-1}>
                  <Button variant="ghost" size="sm">Log in</Button>
                </Link>
                <Link href="/request-demo" tabIndex={-1}>
                  <Button size="sm" className="bg-[#1a382c] hover:bg-[#142c23]">Request a demo</Button>
                </Link>
              </>
            )}
          </div>
          <MarketingMobileNav sessionRole={session?.user?.platformRole as string | undefined} />
        </div>
      </nav>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-line mt-auto">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-7 py-11">
          <div className="flex items-center gap-[9px] text-[19px] font-bold font-serif text-ink">
            <img src="/openordo_logo.png" alt="OpenORDO Logo" className="h-[36px] w-auto" />
            OpenORDO
          </div>
          <div className="flex flex-wrap gap-10 md:gap-20">
            <div className="flex flex-col gap-2.5">
              <div className="text-[12px] font-bold text-ink uppercase tracking-wider mb-2">Product</div>
              <Link href="/features" className="text-[13.5px] text-ink-soft hover:text-ink">Features</Link>
              <Link href="/workflow" className="text-[13.5px] text-ink-soft hover:text-ink">How it works</Link>
              <Link href="/addons" className="text-[13.5px] text-ink-soft hover:text-ink">Add-ons</Link>
              <Link href="/pricing" className="text-[13.5px] text-ink-soft hover:text-ink">Pricing</Link>
            </div>
            
            <div className="flex flex-col gap-2.5">
              <div className="text-[12px] font-bold text-ink uppercase tracking-wider mb-2">Legal</div>
              <Link href="/legal/terms" className="text-[13.5px] text-ink-soft hover:text-ink">Terms of Service</Link>
              <Link href="/legal/privacy" className="text-[13.5px] text-ink-soft hover:text-ink">Privacy Policy</Link>
              <Link href="/legal/dpa" className="text-[13.5px] text-ink-soft hover:text-ink">Data Processing Agreement</Link>
              <Link href="/legal/refund" className="text-[13.5px] text-ink-soft hover:text-ink">Refund Policy</Link>
              <Link href="/legal/billing" className="text-[13.5px] text-ink-soft hover:text-ink">Billing Terms</Link>
              <Link href="/legal/acceptable-use" className="text-[13.5px] text-ink-soft hover:text-ink">Acceptable Use</Link>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="text-[12px] font-bold text-ink uppercase tracking-wider mb-2">Compliance</div>
              <Link href="/legal/security" className="text-[13.5px] text-ink-soft hover:text-ink">Security & Trust</Link>
              <Link href="/legal/sub-processors" className="text-[13.5px] text-ink-soft hover:text-ink">Sub-processors</Link>
              <Link href="/legal/retention" className="text-[13.5px] text-ink-soft hover:text-ink">Data Retention</Link>
              <Link href="/legal/cookies" className="text-[13.5px] text-ink-soft hover:text-ink">Cookie Policy</Link>
              <Link href="/legal/medical-disclaimer" className="text-[13.5px] text-ink-soft hover:text-ink">Medical Disclaimer</Link>
              <Link href="/legal/hipaa" className="text-[13.5px] text-ink-soft hover:text-ink">HIPAA BAA</Link>
            </div>
            
            <div className="flex flex-col gap-2.5">
              <div className="text-[12px] font-bold text-ink uppercase tracking-wider mb-2">Company</div>
              <Link href="/contact" className="text-[13.5px] text-ink-soft hover:text-ink">Contact Us</Link>
              <Link href="/login" className="text-[13.5px] text-ink-soft hover:text-ink">Clinic Login</Link>
              <Link href="/request-demo" className="text-[13.5px] text-ink-soft hover:text-ink">Request a Demo</Link>
              <Link href="/account-deletion" className="text-[13.5px] text-ink-soft hover:text-ink">Account Deletion</Link>
            </div>
          </div>
          <div className="text-[13px] text-ink-soft">© 2026 OpenORDO.</div>
        </div>
      </footer>
    </div>
  )
}
