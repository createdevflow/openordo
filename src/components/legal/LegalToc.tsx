"use client"

import { useEffect, useState } from "react"
import type { TocEntry } from "@/lib/legal"

interface LegalTocProps {
  entries: TocEntry[]
}

export function LegalToc({ entries }: LegalTocProps) {
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    if (entries.length === 0) return

    const headingIds = entries.map((e) => e.id)
    const observer = new IntersectionObserver(
      (obs) => {
        for (const entry of obs) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      { rootMargin: "0px 0px -70% 0px" }
    )

    headingIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [entries])

  if (entries.length === 0) return null

  return (
    <aside className="legal-toc" aria-label="On this page">
      <div className="legal-toc-label">On this page</div>
      <nav>
        <ul>
          {entries.map((entry) => (
            <li
              key={entry.id}
              style={{ paddingLeft: entry.level === 3 ? "12px" : "0" }}
            >
              <a
                href={`#${entry.id}`}
                className={`legal-toc-link${activeId === entry.id ? " legal-toc-link--active" : ""}`}
              >
                {entry.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
