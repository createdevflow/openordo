"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { LegalSlug } from "@/lib/legal-constants"
import { LEGAL_GROUPS, SLUG_LABELS } from "@/lib/legal-constants"

interface LegalSidebarProps {
  /** The slug of the currently rendered page. */
  current: LegalSlug
}

export function LegalSidebar({ current }: LegalSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarContent = (
    <nav aria-label="Legal pages" className="legal-sidebar-nav">
      {LEGAL_GROUPS.map((group) => (
        <div key={group.label} className="legal-sidebar-group">
          <div className="legal-sidebar-group-label">{group.label}</div>
          <ul>
            {group.slugs.map((slug) => (
              <li key={slug}>
                <Link
                  href={`/legal/${slug}`}
                  className={`legal-sidebar-link${slug === current ? " legal-sidebar-link--active" : ""}`}
                  aria-current={slug === current ? "page" : undefined}
                >
                  {SLUG_LABELS[slug]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="legal-sidebar-desktop" aria-label="Legal navigation">
        {sidebarContent}
      </aside>

      {/* Mobile collapsible */}
      <div className="legal-sidebar-mobile">
        <button
          className="legal-mobile-toggle"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          aria-controls="legal-mobile-nav"
        >
          <span>Legal pages</span>
          {mobileOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {mobileOpen && (
          <div id="legal-mobile-nav" className="legal-mobile-nav">
            {sidebarContent}
          </div>
        )}
      </div>
    </>
  )
}
