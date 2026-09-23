/**
 * legal.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilities for the /legal/* pages:
 *  - Slug → .md file map
 *  - File reading (fs, resolved at build time for static generation)
 *  - Extraction of title, lastUpdated, first paragraph, and H2 headings
 *  - Placeholder token replacement with dev/prod warning behaviour
 */

import fs from "fs"
import path from "path"
import { LEGAL_CONFIG } from "./legal-config"

// ── Slug definitions ──────────────────────────────────────────────────────────

export type LegalSlug =
  | "terms"
  | "privacy"
  | "dpa"
  | "refund"
  | "billing"
  | "acceptable-use"
  | "security"
  | "sub-processors"
  | "retention"
  | "cookies"
  | "medical-disclaimer"
  | "hipaa"

/**
 * Ordered list of slugs in sidebar groups.
 * Order within each group controls Previous/Next navigation.
 */
export const LEGAL_GROUPS: { label: string; slugs: LegalSlug[] }[] = [
  {
    label: "Agreements",
    slugs: ["terms", "privacy", "dpa", "hipaa", "billing", "refund", "acceptable-use"],
  },
  {
    label: "Trust",
    slugs: ["security", "sub-processors", "retention", "cookies"],
  },
  {
    label: "Disclaimers",
    slugs: ["medical-disclaimer"],
  },
]

/** Flat ordered list of all 12 slugs (for prev/next). */
export const ALL_SLUGS: LegalSlug[] = LEGAL_GROUPS.flatMap((g) => g.slugs)

/** Human-readable titles for each slug (used in sidebar & metadata). */
export const SLUG_LABELS: Record<LegalSlug, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  dpa: "Data Processing Agreement",
  refund: "Refund Policy",
  billing: "Billing Terms",
  "acceptable-use": "Acceptable Use Policy",
  security: "Security & Trust",
  "sub-processors": "Sub-processors",
  retention: "Data Retention",
  cookies: "Cookie Policy",
  "medical-disclaimer": "Medical Disclaimer",
  hipaa: "HIPAA Business Associate Agreement",
}

// ── File reading ──────────────────────────────────────────────────────────────

/** Resolves the absolute path to a .md file for a given slug. */
function mdPath(slug: LegalSlug): string {
  return path.join(process.cwd(), "docs", "legal", `${slug}.md`)
}

/** Returns the raw markdown string for a slug, or null if the file is missing. */
export function readLegalMd(slug: LegalSlug): string | null {
  const filePath = mdPath(slug)
  if (!fs.existsSync(filePath)) return null
  return fs.readFileSync(filePath, "utf-8")
}

// ── Token replacement ─────────────────────────────────────────────────────────

const TOKEN_RE = /\{\{([A-Z_]+)\}\}/g

/**
 * Replaces all {{TOKEN}} occurrences in the markdown.
 * In development: leaves unresolved tokens wrapped in a data attribute span
 * so they can be highlighted in the browser.
 * In production: replaces with an empty string and logs a build warning.
 */
export function applyTokens(raw: string, slug: string): string {
  const unresolved: string[] = []

  const result = raw.replace(TOKEN_RE, (_, key: string) => {
    const val = LEGAL_CONFIG[key]
    if (val !== undefined && val !== "") return val
    unresolved.push(key)
    if (process.env.NODE_ENV === "production") return ""
    // Development: render visually highlighted span
    return `<span data-token="${key}" style="background:var(--amber-soft,#F3E3C6);padding:0 3px;border-radius:3px;font-family:monospace">{{${key}}}</span>`
  })

  if (unresolved.length > 0) {
    if (process.env.NODE_ENV === "production") {
      // eslint-disable-next-line no-console
      console.warn(
        `[legal] Unresolved placeholders in ${slug}.md: ${unresolved.join(", ")}. Fill them in src/lib/legal-config.ts before launch.`
      )
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `[legal] ${slug}.md has unresolved placeholders: ${unresolved.join(", ")}`
      )
    }
  }

  return result
}

// ── Parsing helpers ───────────────────────────────────────────────────────────

/** Extracts the text of the first H1 (`# …`) from raw markdown. */
export function extractH1(raw: string): string {
  const m = raw.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : ""
}

/**
 * Extracts the value of `**Last updated:** …` from the markdown.
 * Returns an empty string if not found.
 */
export function extractLastUpdated(raw: string): string {
  const m = raw.match(/\*\*Last updated:\*\*\s*(.+)/i)
  return m ? m[1].trim() : ""
}

/**
 * Extracts the first non-blank paragraph that is not a heading, HR, or
 * "Last updated" line — used as the meta description.
 */
export function extractFirstParagraph(raw: string): string {
  const lines = raw.split("\n")
  const paragraphLines: string[] = []
  let collecting = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (collecting && paragraphLines.length) break
      continue
    }
    if (trimmed.startsWith("#")) continue
    if (trimmed.startsWith("---")) continue
    if (trimmed.toLowerCase().startsWith("**last updated:**")) continue

    collecting = true
    paragraphLines.push(trimmed)
  }

  return paragraphLines
    .join(" ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .slice(0, 200)
}

/** GitHub-style heading slug: lowercase, spaces to hyphens, strip punctuation. */
export function githubSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // strip punctuation except - and _
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

export interface TocEntry {
  text: string
  id: string
  level: number
}

/** Extracts H2 (and optionally H3) headings and their anchor ids. */
export function extractToc(raw: string): TocEntry[] {
  const entries: TocEntry[] = []
  const re = /^(#{2,3})\s+(.+)$/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    const level = m[1].length
    const text = m[2].trim().replace(/\*\*(.+?)\*\*/g, "$1") // strip bold markers for display
    entries.push({ text, id: githubSlug(m[2].trim()), level })
  }
  return entries
}
