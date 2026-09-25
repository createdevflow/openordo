/**
 * legal-config.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for every {{TOKEN}} used in docs/legal/*.md.
 *
 * Fill in empty strings before going live. The check-legal-placeholders script
 * will list any that are still empty.
 *
 * Where it makes sense, values are pulled from environment variables so that
 * staging and production can differ without code changes. Fall back to an
 * explicit TODO string for tokens that are not env-var candidates.
 *
 * DO NOT put secrets (passwords, private keys) here. These values appear on
 * public-facing legal pages.
 */

export const LEGAL_CONFIG: Record<string, string> = {

  // ── Contact email addresses ───────────────────────────────────────────────

  // ── Infrastructure / sub-processors ──────────────────────────────────────
}
