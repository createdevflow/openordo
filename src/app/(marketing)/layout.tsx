import * as React from "react"
import Link from "next/link"
import { ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/Button"
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
            <Link href="/#features" className="text-[14.5px] font-medium text-ink-soft hover:text-ink">Features</Link>
            <Link href="/#workflow" className="text-[14.5px] font-medium text-ink-soft hover:text-ink">How it works</Link>
            <Link href="/pricing" className="text-[14.5px] font-medium text-ink-soft hover:text-ink">Pricing</Link>
            <Link href="/#addons" className="text-[14.5px] font-medium text-ink-soft hover:text-ink">Add-ons</Link>
            <Link href="/#faq" className="text-[14.5px] font-medium text-ink-soft hover:text-ink">FAQ</Link>
          </div>
          <div className="flex items-center gap-2.5">
            {session ? (
              <Link href={session.user?.platformRole === "SUPER_ADMIN" ? "/admin" : "/dashboard"} tabIndex={-1}>
                <Button size="sm">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" tabIndex={-1}>
                  <Button variant="ghost" size="sm">Log in</Button>
                </Link>
                <Link href="/register" tabIndex={-1}>
                  <Button size="sm">Start free</Button>
                </Link>
              </>
            )}
          </div>
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
          <div className="flex gap-10">
            <div className="flex flex-col gap-2">
              <Link href="/#features" className="text-[13.5px] text-ink-soft hover:text-ink">Features</Link>
              <Link href="/pricing" className="text-[13.5px] text-ink-soft hover:text-ink">Pricing</Link>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/#faq" className="text-[13.5px] text-ink-soft hover:text-ink">FAQ</Link>
              <Link href="/login" className="text-[13.5px] text-ink-soft hover:text-ink">Log in</Link>
            </div>
          </div>
          <div className="text-[13px] text-ink-soft">© 2026 OpenORDO.</div>
        </div>
      </footer>
    </div>
  )
}
