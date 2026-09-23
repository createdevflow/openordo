import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ALL_SLUGS,
  SLUG_LABELS,
  readLegalMd,
  applyTokens,
  extractH1,
  extractLastUpdated,
  extractToc,
  type LegalSlug,
} from "@/lib/legal"
import { LegalSidebar } from "./LegalSidebar"
import { LegalToc } from "./LegalToc"
import { LegalMarkdown } from "./LegalMarkdown"

interface LegalDocumentProps {
  slug: LegalSlug
}

export async function LegalDocument({ slug }: LegalDocumentProps) {
  const raw = readLegalMd(slug)
  if (!raw) notFound()

  const withTokens = applyTokens(raw, slug)

  const title = extractH1(raw) // Use raw (no token replacement) for extracting title text
  const lastUpdated = extractLastUpdated(raw)
  const toc = extractToc(raw)

  // Strip the H1 and the "Last updated" line from the rendered body
  // so they're not duplicated (page shell renders them as chrome).
  const bodySource = withTokens
    .replace(/^#\s+.+$/m, "") // remove first H1
    .replace(/^\*\*Last updated:\*\*.+$/m, "") // remove Last updated line

  const currentIndex = ALL_SLUGS.indexOf(slug)
  const prevSlug = currentIndex > 0 ? ALL_SLUGS[currentIndex - 1] : null
  const nextSlug = currentIndex < ALL_SLUGS.length - 1 ? ALL_SLUGS[currentIndex + 1] : null

  return (
    <div className="legal-layout">
      {/* Left sidebar */}
      <LegalSidebar current={slug} />

      {/* Main content */}
      <main className="legal-main" id="legal-content">
        {/* Page title + meta */}
        <header className="legal-header">
          <h1 className="legal-title">{title}</h1>
          {lastUpdated && (
            <p className="legal-last-updated">Last updated: {lastUpdated}</p>
          )}
        </header>

        {/* Rendered markdown body */}
        <LegalMarkdown source={bodySource} />

        {/* Previous / Next navigation */}
        <nav className="legal-prevnext" aria-label="Previous and next documents">
          <div className="legal-prevnext-prev">
            {prevSlug && (
              <Link href={`/legal/${prevSlug}`} className="legal-prevnext-link">
                <span className="legal-prevnext-dir">← Previous</span>
                <span className="legal-prevnext-title">{SLUG_LABELS[prevSlug]}</span>
              </Link>
            )}
          </div>
          <div className="legal-prevnext-next">
            {nextSlug && (
              <Link href={`/legal/${nextSlug}`} className="legal-prevnext-link">
                <span className="legal-prevnext-dir">Next →</span>
                <span className="legal-prevnext-title">{SLUG_LABELS[nextSlug]}</span>
              </Link>
            )}
          </div>
        </nav>
      </main>

      {/* Right TOC (desktop only) */}
      <LegalToc entries={toc} />
    </div>
  )
}
