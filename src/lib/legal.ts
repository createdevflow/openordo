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
import { LegalSlug, LEGAL_GROUPS, ALL_SLUGS, SLUG_LABELS } from "./legal-constants"

export type { LegalSlug }
export { LEGAL_GROUPS, ALL_SLUGS, SLUG_LABELS }

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
    // Development: render visually highlighted span via remark-gfm strikethrough (del) mapping
    return `~~{{${key}}}~~`
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
