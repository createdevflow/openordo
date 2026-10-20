"use client"
import { useState, useEffect } from "react"
import { Menu, X, ChevronDown } from "lucide-react"
import Link from "next/link"
import { Button } from "./Button"

export function MarketingMobileNav({ sessionRole }: { sessionRole?: string | null }) {
  const [open, setOpen] = useState(false)
  const [legalOpen, setLegalOpen] = useState(false)

  // Auto-close on resize to desktop (lg: >= 1024px)
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setOpen(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="lg:hidden flex items-center">
      <button 
        type="button"
        onClick={() => setOpen(!open)} 
        className="text-ink p-1 rounded-md hover:bg-paper-raised cursor-pointer transition-colors"
        aria-label="Toggle navigation menu"
        aria-expanded={open}
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 bg-[#F1F0EA] border-b border-line px-7 py-5 flex flex-col gap-3.5 shadow-lg z-50 max-h-[calc(100vh-80px)] overflow-y-auto">
          <Link onClick={() => setOpen(false)} href="/features" className="text-[15.5px] font-medium text-ink hover:text-forest transition-colors">Features</Link>
          <Link onClick={() => setOpen(false)} href="/workflow" className="text-[15.5px] font-medium text-ink hover:text-forest transition-colors">How it works</Link>
          <Link onClick={() => setOpen(false)} href="/pricing" className="text-[15.5px] font-medium text-ink hover:text-forest transition-colors">Pricing</Link>
          <Link onClick={() => setOpen(false)} href="/addons" className="text-[15.5px] font-medium text-ink hover:text-forest transition-colors">Add-ons</Link>
          <Link onClick={() => setOpen(false)} href="/contact" className="text-[15.5px] font-medium text-ink hover:text-forest transition-colors">Contact Us</Link>
          
          {/* Legal Pages Dropdown in Mobile */}
          <div>
            <button
              type="button"
              onClick={() => setLegalOpen(!legalOpen)}
              className="w-full text-left text-[15.5px] font-medium text-ink flex items-center justify-between cursor-pointer py-0.5"
            >
              <span>Legal & Compliance</span>
              <ChevronDown size={16} className={`transition-transform duration-200 ${legalOpen ? "rotate-180" : ""}`} />
            </button>
            {legalOpen && (
              <div className="mt-2 pl-3 flex flex-col gap-2 border-l-2 border-line">
                <Link onClick={() => setOpen(false)} href="/legal/terms" className="text-[13.5px] text-ink-soft hover:text-ink">Terms of Service</Link>
                <Link onClick={() => setOpen(false)} href="/legal/privacy" className="text-[13.5px] text-ink-soft hover:text-ink">Privacy Policy</Link>
                <Link onClick={() => setOpen(false)} href="/legal/dpa" className="text-[13.5px] text-ink-soft hover:text-ink">Data Processing (DPA)</Link>
                <Link onClick={() => setOpen(false)} href="/legal/security" className="text-[13.5px] text-ink-soft hover:text-ink">Security & Trust</Link>
              </div>
            )}
          </div>

          <div className="h-px bg-line my-1"></div>
          
          <div className="flex flex-col gap-3 pt-1">
            {sessionRole ? (
              <Link onClick={() => setOpen(false)} href={sessionRole === "SUPER_ADMIN" ? "/admin" : "/dashboard"}>
                <Button className="w-full">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link onClick={() => setOpen(false)} href="/login">
                  <Button variant="ghost" className="w-full justify-center bg-paper-raised">Log in</Button>
                </Link>
                <Link onClick={() => setOpen(false)} href="/request-demo">
                  <Button className="w-full justify-center bg-[#1a382c] hover:bg-[#142c23]">Request a demo</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
