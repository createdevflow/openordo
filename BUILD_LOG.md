# BUILD_LOG.md � SMS Integration

## Context
Building SMS as a third communication channel per `CHARTWELL_SMS_INTEGRATION_SPEC.md`.
Extends the existing WhatsApp/Communications infrastructure rather than replacing it.

---

## Step 1 � Schema Migration (2026-09-27)

**Action:** Extended `PlatformCommunicationSettings` with SMS fields, added `SmsMessageLog` model.

**Migration strategy:**
- Added `otpChannels String[] @default(["EMAIL"])` and `otpMode String @default("USER_CHOOSES")` as NEW fields alongside the existing `otpChannel` / `otpBothMode` fields.
- Old fields are preserved in the DB but are no longer read by new code.
- All code updated to use `otpChannels` / `otpMode` going forward.

---

## Step 2 � SmsProvider Interface + Implementations (2026-09-27)

**Providers:**
- India: MSG91 (primary). Kaleyra is listed as alternative.
- International: Twilio.
- Routing: Numbers starting with `+91` route to India provider. All others route to International.

---

## Step 5 � SMS_ELIGIBLE_EVENT_TYPES guard (2026-09-27)

Implemented in `src/lib/sms.ts`. The guard throws an Error if called with any ineligible event type.

---

## Step 7 � Email alongside SMS for appointment confirmation (2026-09-27)

**Decision: Email is always sent alongside SMS when the fallback channel is SMS.**

Rationale: The spec states "Also send the email confirmation alongside it (SMS is a supplement here, not a replacement for the email record)". Email is the durable record; SMS is a supplement. If SMS fails, email still goes out.

---

## Step 8 � DLT Compliance Dependency (2026-09-27)

**COMPLIANCE FLAG: INDIA SMS IS NOT PRODUCTION-READY WITHOUT REAL DLT TEMPLATE IDs**

Per TRAI DLT regulations:
- `smsDltTemplateIdOtp` must be a real, pre-registered DLT template ID.
- `smsDltTemplateIdConfirmation` must be a real, pre-registered DLT template ID.
- These require registering as a Principal Entity on a DLT platform and getting templates approved.
- The India SMS block must only be enabled after real DLT template IDs are entered.
- The International/Twilio path has NO equivalent DLT requirement.

## Production Fixes

### 1. Payments & tax
- **Root cause:** The payment flows directly read `plan.priceMonthlyInr` and sent it to Razorpay, completely bypassing tax logic. The pricing logic wasn't centralized and `<CheckoutPanel>` wasn't universally used. Stripe was not fully wired.
- **Fix:** Created `CheckoutQuote` table and `/api/billing/quote` + `/api/billing/checkout` endpoints. Replaced individual Razorpay subscription endpoints with centralized logic handling both Razorpay and Stripe with taxes correctly calculated via `computeTax`.

### 2. Video consultation
- **Root causes:** 
  1. Timezone ignorance: `computeTokenWindow` parses local time string and feeds it to `setHours()` which assumes the server's timezone (UTC on prod). This delays IST appointments by 5.5 hours.
  2. The join page did not implement the waiting screen with countdown, simply throwing a static error if visited early.
  3. Real video wasn't implemented (no WebRTC).
- **Fix:** Added `timezone` to Clinic, stored `startsAt` (UTC) in Appointment, migrated existing records (assuming they were in the clinic's local time), and added a dynamic waiting room polling mechanism. Integrated LiveKit as the VideoProvider.

### 3. Patient portal login
- **Root causes:** 
  1. The Auth.js `Credentials` provider only queried the staff `User` table, meaning no patient could ever log in.
  2. Accounts were not reliably created across all entry points.
  3. The login form demanded a password even for accounts without one.
- **Fix:** Separated patient auth provider to query `PatientAccount`, enforced account creation via `ensurePatientAccount` on all paths, implemented login flow step 1 (send code) vs step 2 (password), and normalized identifiers.

### 4. Email links
- **Root causes:** Email templates used hardcoded `openordo.com` paths that didn't match the actual `src/app` folder structure (e.g. `/privacy` instead of `/legal/privacy`).
- **Fix:** Created `src/lib/routes.ts` as the single source of truth for all URLs, updated all templates, and added permanent redirects for old URLs.


## SEO, Geo-Pricing & Private Clinic Storage

### Part A: Storage Module
- Discovered that the storage module `src/lib/storage` was already implemented.
- Discovered that `StoredFile` was already in the Prisma schema.
- Confirmed that the `scripts/migrate-storage.ts` script exists and was already configured.

### Part B: Geo-Based Pricing
- Discovered that `src/lib/pricing/context.ts` and `PriceWithTax` component are already implemented.
- Markets & Geo section in Admin settings (`SettingsShell.tsx`) was already built.

### Part C: SEO
- Created `src/lib/seo/routes.ts` containing the `PUBLIC_ROUTES` array, the `NEVER_INDEX_PREFIXES` array, and the `assertIndexable()` guard.
- Updated `src/proxy.ts` to enforce a single-hop 308 redirect for trailing slashes and `www.` domain.
- Configured `src/proxy.ts` to return the `X-Robots-Tag: noindex, nofollow` for private surface paths, search variants, and non-production environments.
- Created dynamic `app/robots.ts` to output `Disallow: /` on non-prod and exclude private prefixes otherwise.
- Created `app/sitemap.ts` combining auto-routes, opted-in `BookingPageConfig` pages, and manual database entries (respecting inclusions and exclusions).
- Created branded 404 page (`app/not-found.tsx`) with noindex tag and links to standard navigation paths.
- Updated `app/layout.tsx` with `metadataBase` to correctly resolve canonical paths.
- Wrote `scripts/verify-seo.ts` isolation script to check robots.txt, sitemap output (including safety bounds against exposing `/api/files`), and response headers.

## Manual Testing Matrix
1. **Network Simulation**: Join a call locally, then throttle network to Fast 3G in Chrome DevTools. Verify Video tier drops (to Low/Audio-only) based on quality Limiter.
2. **Tab Switch (Screen Lock)**: Switch tabs on mobile, wait 30s. Verify WebRTC 'disconnected' state triggers ICE restart when returning.
3. **Doctor vs Patient View**: Verify the UI layout for Doctor (Consultation panel) vs Patient (only Chat and Files).
4. **TURN Relay test**: Connect one peer on corporate/restrictive firewall. Verify that \stats\ report shows TURN relay IP usage.
5. **Quality API**: End the call. Verify \CallQualityLog\ row is inserted in database.

