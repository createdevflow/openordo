# BUILD_LOG.md — SMS Integration

## Context
Building SMS as a third communication channel per `CHARTWELL_SMS_INTEGRATION_SPEC.md`.
Extends the existing WhatsApp/Communications infrastructure rather than replacing it.

---

## Step 1 — Schema Migration (2026-09-27)

**Action:** Extended `PlatformCommunicationSettings` with SMS fields, added `SmsMessageLog` model.

**Migration strategy:**
- Added `otpChannels String[] @default(["EMAIL"])` and `otpMode String @default("USER_CHOOSES")` as NEW fields alongside the existing `otpChannel` / `otpBothMode` fields.
- Old fields are preserved in the DB but are no longer read by new code.
- All code updated to use `otpChannels` / `otpMode` going forward.

---

## Step 2 — SmsProvider Interface + Implementations (2026-09-27)

**Providers:**
- India: MSG91 (primary). Kaleyra is listed as alternative.
- International: Twilio.
- Routing: Numbers starting with `+91` route to India provider. All others route to International.

---

## Step 5 — SMS_ELIGIBLE_EVENT_TYPES guard (2026-09-27)

Implemented in `src/lib/sms.ts`. The guard throws an Error if called with any ineligible event type.

---

## Step 7 — Email alongside SMS for appointment confirmation (2026-09-27)

**Decision: Email is always sent alongside SMS when the fallback channel is SMS.**

Rationale: The spec states "Also send the email confirmation alongside it (SMS is a supplement here, not a replacement for the email record)". Email is the durable record; SMS is a supplement. If SMS fails, email still goes out.

---

## Step 8 — DLT Compliance Dependency (2026-09-27)

**COMPLIANCE FLAG: INDIA SMS IS NOT PRODUCTION-READY WITHOUT REAL DLT TEMPLATE IDs**

Per TRAI DLT regulations:
- `smsDltTemplateIdOtp` must be a real, pre-registered DLT template ID.
- `smsDltTemplateIdConfirmation` must be a real, pre-registered DLT template ID.
- These require registering as a Principal Entity on a DLT platform and getting templates approved.
- The India SMS block must only be enabled after real DLT template IDs are entered.
- The International/Twilio path has NO equivalent DLT requirement.
