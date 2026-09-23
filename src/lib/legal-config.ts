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
  /** Registered legal name of the entity — appears in every document footer */
  LEGAL_ENTITY: process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? "",

  /** Full registered address of the legal entity */
  REGISTERED_ADDRESS: process.env.NEXT_PUBLIC_REGISTERED_ADDRESS ?? "",

  /** City whose courts have jurisdiction — used in Terms § governing law */
  JURISDICTION_CITY: process.env.NEXT_PUBLIC_JURISDICTION_CITY ?? "",

  /** GST Identification Number (India) — appears in Billing Terms */
  GSTIN: process.env.NEXT_PUBLIC_GSTIN ?? "",

  // ── Contact email addresses ───────────────────────────────────────────────

  /** General support email visible to customers */
  SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "",

  /** Email for legal/contract queries */
  LEGAL_EMAIL: process.env.NEXT_PUBLIC_LEGAL_EMAIL ?? "",

  /** Email for privacy / data-subject requests */
  PRIVACY_EMAIL: process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? "",

  /** Email for security vulnerability disclosure */
  SECURITY_EMAIL: process.env.NEXT_PUBLIC_SECURITY_EMAIL ?? "",

  /** Name of the Grievance Officer (required under India's DPDP Act) */
  DPO_NAME: process.env.NEXT_PUBLIC_DPO_NAME ?? "",

  // ── Infrastructure / sub-processors ──────────────────────────────────────

  /** Where clinic data is hosted — e.g. "India (Mumbai, AWS ap-south-1)" */
  DATA_REGION: process.env.NEXT_PUBLIC_DATA_REGION ?? "",

  /** Managed PostgreSQL provider name — e.g. "Supabase" or "Neon" */
  DATABASE_PROVIDER: process.env.NEXT_PUBLIC_DATABASE_PROVIDER ?? "",

  /** Location of the managed database — e.g. "India (Mumbai)" */
  DATABASE_REGION: process.env.NEXT_PUBLIC_DATABASE_REGION ?? "",

  /** Transactional email provider — e.g. "Resend" */
  EMAIL_PROVIDER: process.env.NEXT_PUBLIC_EMAIL_PROVIDER ?? "",

  /** Location of email provider infrastructure — e.g. "United States" */
  EMAIL_REGION: process.env.NEXT_PUBLIC_EMAIL_REGION ?? "",

  /** Vercel deployment region — e.g. "Global (Vercel Edge Network)" */
  VERCEL_REGION: process.env.NEXT_PUBLIC_VERCEL_REGION ?? "Global (Vercel Edge Network)",

  /** Video consultation provider — e.g. "Daily.co" */
  VIDEO_PROVIDER: process.env.NEXT_PUBLIC_VIDEO_PROVIDER ?? "",

  /** Location of video provider infrastructure — e.g. "United States" */
  VIDEO_REGION: process.env.NEXT_PUBLIC_VIDEO_REGION ?? "",

  /** File/object storage provider — e.g. "Amazon S3" */
  STORAGE_PROVIDER: process.env.NEXT_PUBLIC_STORAGE_PROVIDER ?? "",

  /** Location of storage provider infrastructure — e.g. "India (ap-south-1)" */
  STORAGE_REGION: process.env.NEXT_PUBLIC_STORAGE_REGION ?? "",
}
