"use client"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import Link from "next/link"
import { Button } from "./Button"

export function MarketingMobileNav({ sessionRole }: { sessionRole?: string | null }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden flex items-center">
      <button onClick={() => setOpen(!open)} className="text-ink p-1">
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {open && (
        <div className="absolute top-[72px] left-0 right-0 bg-paper border-b border-line p-5 flex flex-col gap-4 shadow-sm z-50">
          <Link onClick={() => setOpen(false)} href="/features" className="text-[15.5px] font-medium text-ink">Features</Link>
          <Link onClick={() => setOpen(false)} href="/workflow" className="text-[15.5px] font-medium text-ink">How it works</Link>
          <Link onClick={() => setOpen(false)} href="/pricing" className="text-[15.5px] font-medium text-ink">Pricing</Link>
          <Link onClick={() => setOpen(false)} href="/addons" className="text-[15.5px] font-medium text-ink">Add-ons</Link>
          <Link onClick={() => setOpen(false)} href="/contact" className="text-[15.5px] font-medium text-ink">Contact Us</Link>
          
          <div className="h-px bg-line my-1"></div>
          
          <div className="flex flex-col gap-3">
            {sessionRole ? (
              <Link onClick={() => setOpen(false)} href={sessionRole === "SUPER_ADMIN" ? "/admin" : "/dashboard"}>
                <Button className="w-full">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link onClick={() => setOpen(false)} href="/login">
                  <Button variant="ghost" className="w-full justify-center bg-paper-raised">Log in</Button>
                </Link>
                <Link onClick={() => setOpen(false)} href="/register">
                  <Button className="w-full justify-center">Start free</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
