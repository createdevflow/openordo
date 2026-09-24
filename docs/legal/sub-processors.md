# Sub-processors

**Last updated:** 24 September 2026

OpenORDO uses a small number of trusted third parties ("**sub-processors**") to help provide the service. This page lists them, what they do, what data they handle and where. It is referenced by the [Data Processing Agreement](/legal/dpa) and the [Privacy Policy](/legal/privacy).

Each sub-processor is bound by a written agreement with data protection and security terms that are no less protective than our own commitments to you. We remain responsible for their performance.

---

## 1. Current sub-processors

### Core infrastructure (every customer)

| Sub-processor | Purpose | Data involved | Location |
|---|---|---|---|
| **Vercel Inc.** | Application hosting, serverless execution, content delivery and scheduled jobs | All data in transit through the application; request logs | Global |
| **Database Provider** (managed PostgreSQL) | Primary database and backups | All Customer Data at rest: accounts, clinics, patients, appointments, invoices, medical records, prescriptions, inventory, audit logs | Various |
| **Stripe, Inc.** (and Stripe Payments India / Stripe Payments Europe as applicable) | Payment processing, subscriptions, invoices, customer portal | Clinic owner name, email, billing details, payment method (held by Stripe), transaction data. **No patient data.** | United States, and other Stripe processing locations |
| **Email Provider** (for example Resend or Postmark) | Transactional email: verification codes, staff invites, billing and trial notices | Recipient name, email address and message content (which does not include clinical records) | Various |
| **Google LLC** (Google Sign-In) | Optional sign-in with Google | Name, email address, profile image (from Google to us) | United States and other Google locations |

### Add-on specific (only when the clinic uses the add-on)

| Sub-processor | Add-on | Purpose | Data involved | Location |
|---|---|---|---|---|
| **Video Provider** (for example Daily.co, Twilio or LiveKit) | Video Consultation | Real-time video and audio, and room management | Room identifier, participant display names, audio and video streams, connection metadata. **Not recorded by OpenORDO.** | Various |
| **Storage Provider** (for example Amazon S3 or Cloudinary) | File uploads (logos, branding, documents) where enabled | File storage | Uploaded files | Various |

## 2. What each provider does not receive

- Stripe **does not** receive patient data, medical records or appointment details.
- Google Sign-In **does not** receive any data from your Clinic; it only tells us who is signing in.
- The email provider **does not** receive medical records, diagnoses, prescription details or invoice line items. Emails are limited to account, invite and billing notices.
- The video provider **does not** receive the patient chart or notes typed during the call; those stay in OpenORDO.

## 3. Affiliates and personnel

OpenORDO personnel and contractors who need access to provide support are bound by confidentiality and access controls; they are not sub-processors listed here. If we use an affiliate as a sub-processor in future, it will be listed on this page.

## 4. Changes to this list

1. We give at least **30 days' notice** before a new sub-processor starts processing Customer Personal Data, or before we replace one, by email to the Clinic Owner and by updating this page.
2. You can object on reasonable data protection grounds within that period by emailing [support@openordo.com](mailto:support@openordo.com). See Section 6 of the [DPA](/legal/dpa) for what happens next.
3. In an emergency (for example replacing a provider quickly for security or continuity), we may make a change sooner and will notify you as soon as possible.

## 5. Subscribe to updates

To be emailed when this list changes, write to [support@openordo.com](mailto:support@openordo.com) with the subject "Sub-processor updates". Clinic Owners are notified automatically.

## 6. Log of changes

| Date | Change |
|---|---|
| 24 September 2026 | Initial publication of this list |

## 7. Contact

[support@openordo.com](mailto:support@openordo.com) · OpenORDO, Chandigarh, India
