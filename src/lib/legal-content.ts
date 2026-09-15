export const LEGAL_PAGES: Record<string, { title: string, lastUpdated: string, content: string }> = {
  "terms": {
    title: "Terms of Service",
    lastUpdated: "Sept 15, 2026",
    content: `
## 1. Introduction
Welcome to OpenORDO. These Terms of Service govern your use of our platform. By accessing OpenORDO, you agree to be bound by these terms.

## 2. Subscription Terms
Subscriptions are billed in advance on a monthly or yearly basis. You may upgrade, downgrade, or cancel your plan at any time.

## 3. Acceptable Use
You agree to use OpenORDO strictly for clinical and administrative purposes. Misuse of patient data or unauthorized access is strictly prohibited.

## 4. Limitation of Liability
OpenORDO is provided "as is". We are not liable for any indirect damages, loss of data, or business interruption arising from the use of our service.
    `
  },
  "privacy": {
    title: "Privacy Policy",
    lastUpdated: "Sept 15, 2026",
    content: `
## 1. Information We Collect
We collect information that you provide to us directly, including clinic staff data, payment information, and Protected Health Information (PHI) entered into the system.

## 2. How We Use Information
We use the information to provide, maintain, and improve our services, and to process transactions.

## 3. Data Sharing
We share data with trusted third-party sub-processors (like Stripe for payments) necessary to provide our service. We do not sell your data.
    `
  },
  "dpa": {
    title: "Data Processing Agreement (DPA)",
    lastUpdated: "Sept 15, 2026",
    content: `
This DPA supplements the Terms of Service. It outlines the obligations of OpenORDO (the Data Processor) and the Clinic (the Data Controller) regarding the processing of personal data under applicable laws like the DPDP Act 2023.

## 1. Processing Roles
The Clinic determines the purposes and means of processing personal data. OpenORDO processes data only on documented instructions from the Clinic.

## 2. Security
OpenORDO implements appropriate technical and organizational measures to ensure data security.
    `
  },
  "refund": {
    title: "Refund & Cancellation Policy",
    lastUpdated: "Sept 15, 2026",
    content: `
## 1. Cancellations
You may cancel your subscription at any time. Cancellation will take effect at the end of your current billing cycle.

## 2. Refunds
Subscription fees are generally non-refundable. Exceptions may be made on a case-by-case basis within 7 days of the initial charge.
    `
  },
  "billing": {
    title: "Subscription & Billing Terms",
    lastUpdated: "Sept 15, 2026",
    content: `
## 1. Trials and Auto-Conversion
Free trials automatically convert to paid subscriptions at the end of the trial period unless canceled.

## 2. Proration
Upgrades and downgrades to subscription plans will be prorated based on the remaining time in the current billing cycle.
    `
  },
  "acceptable-use": {
    title: "Acceptable Use Policy",
    lastUpdated: "Sept 15, 2026",
    content: `
This policy sets out the permitted uses and restrictions of OpenORDO.

You may not use OpenORDO to:
- Violate any laws or regulations (including privacy and healthcare laws).
- Send unsolicited communications or spam.
- Attempt to breach or bypass our security measures.
    `
  },
  "medical-disclaimer": {
    title: "Medical Disclaimer",
    lastUpdated: "Sept 15, 2026",
    content: `
**OpenORDO is an administrative and record-keeping software platform.** 

It is NOT a clinical decision-support tool, diagnostic tool, or a substitute for professional medical advice. Any AI-generated transcriptions or insights must be reviewed and verified by a qualified healthcare professional before being used for clinical decisions.
    `
  },
  "cookies": {
    title: "Cookie Policy",
    lastUpdated: "Sept 15, 2026",
    content: `
We use cookies to improve your experience on our marketing site and platform.

## 1. Essential Cookies
Required for the platform to function (e.g., authentication sessions).

## 2. Analytics Cookies
Help us understand how users interact with our marketing site to improve our services.
    `
  },
  "sub-processors": {
    title: "Sub-processor List",
    lastUpdated: "Sept 15, 2026",
    content: `
To provide our services, OpenORDO engages the following sub-processors:

- **Hosting/Infrastructure:** AWS / DigitalOcean (Data storage and compute)
- **Payments:** Stripe (Payment processing)
- **Email:** Resend / Mailgun (Transactional emails)
- **Video/Telehealth:** Daily.co / Twilio (Video consultation infrastructure)
    `
  },
  "retention": {
    title: "Data Retention & Deletion Policy",
    lastUpdated: "Sept 15, 2026",
    content: `
## 1. Data Retention
We retain clinic and patient data for as long as your account is active.

## 2. Account Cancellation
Upon cancellation, clinics have 30 days to export their data. After 30 days, we will securely delete the data from our active systems, in accordance with applicable laws.
    `
  },
  "security": {
    title: "Security & Trust",
    lastUpdated: "Sept 15, 2026",
    content: `
We take the security of your clinic data seriously.

## 1. Encryption
All data is encrypted in transit (using TLS 1.2+) and at rest (using AES-256).

## 2. Backups
We perform automated daily backups to ensure data integrity and availability in case of an incident.
    `
  },
  "hipaa": {
    title: "HIPAA Business Associate Agreement (BAA)",
    lastUpdated: "Sept 15, 2026",
    content: `
*Note: HIPAA primarily applies to US-based covered entities. This BAA is provided for US clinics onboarding to OpenORDO.*

This BAA outlines our responsibilities as a Business Associate in safeguarding Protected Health Information (PHI) under the Health Insurance Portability and Accountability Act (HIPAA).
    `
  }
}
