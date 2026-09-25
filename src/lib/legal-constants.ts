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

export const ALL_SLUGS: LegalSlug[] = LEGAL_GROUPS.flatMap((g) => g.slugs)

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
