import { notFound } from "next/navigation"
import { Metadata } from "next"
import {
  ALL_SLUGS,
  SLUG_LABELS,
  readLegalMd,
  extractH1,
  extractLastUpdated,
  extractFirstParagraph,
  type LegalSlug,
} from "@/lib/legal"
import { LegalDocument } from "@/components/legal/LegalDocument"
import "@/components/legal/legal.css"

// ── Static generation ─────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return ALL_SLUGS.map((slug) => ({ slug }))
}

// Unknown slugs (not in ALL_SLUGS) → 404
export const dynamicParams = false

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  if (!ALL_SLUGS.includes(slug as LegalSlug)) return {}

  const raw = readLegalMd(slug as LegalSlug)
  if (!raw) return {}

  const h1 = extractH1(raw)
  const description = extractFirstParagraph(raw)

  return {
    title: h1,
    description,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Guard: unknown slugs → 404
  if (!ALL_SLUGS.includes(slug as LegalSlug)) {
    notFound()
  }

  return <LegalDocument slug={slug as LegalSlug} />
}
