# Chartwell Plugins — Marketplace Specification

## 0. What this is

Video Consultation, Inventory Management, and E-Prescriptions are **not** part of any `Plan`
and are **not** in the Feature Catalog from `CHARTWELL_ADMIN_UI_REBUILD_SPEC.md` Section 4.
They are a separate purchasable layer — **Plugins** — that any clinic on any plan (including
Starter) can buy independently, one-time or recurring, and switch on/off inside their own
dashboard. A clinic on the free Starter plan can buy Video Consultation. A clinic on Clinic
Group doesn't get it for free just because they're on the top plan — plugins are always a
separate purchase, by design, because they're the highest-margin, most specialized parts of
the product and shouldn't be diluted into a flat plan price.

This is a new capability layer. Nothing in `CHARTWELL_BUILD_SPEC.md` or
`CHARTWELL_ADMIN_SPEC.md`'s Plan/Feature system changes — Plugins sit alongside it.

---

## 1. Data model

```prisma
enum PluginPricingModel {
  ONE_TIME
  MONTHLY
  YEARLY
}

enum ClinicPluginStatus {
  ACTIVE     // purchase is valid (paid, or one-time, or subscription in good standing)
  EXPIRED    // recurring purchase lapsed (payment failed / canceled and period ended)
  CANCELED   // clinic canceled a recurring plugin; access continues until period end, then → EXPIRED
}

model Plugin {
  id          String   @id @default(cuid())
  slug        String   @unique   // "video-consultation" | "inventory-management" | "e-prescriptions"
  name        String
  tagline     String             // one line, shown on landing page + marketplace card
  description String             // longer copy, shown on the plugin's detail card
  category    String             // "Clinical" | "Operations"
  icon        String             // lucide-react icon name, e.g. "Video", "Package", "FileSignature"

  // Pricing — any of these three can be null if that model isn't offered for this plugin.
  // Admin decides per plugin whether it's one-time-only, subscription-only, or both.
  priceOneTimeINR Int?
  priceOneTimeUSD Int?
  priceMonthlyINR Int?
  priceMonthlyUSD Int?
  priceYearlyINR  Int?
  priceYearlyUSD  Int?

  isActive  Boolean @default(true)  // visible/purchasable platform-wide
  sortOrder Int     @default(0)

  stripeProductId      String?
  stripePriceIdOneTime String?
  stripePriceIdMonthly String?
  stripePriceIdYearly  String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  clinicPlugins ClinicPlugin[]
}

model ClinicPlugin {
  id           String              @id @default(cuid())
  clinicId     String
  pluginId     String
  pricingModel PluginPricingModel
  status       ClinicPluginStatus  @default(ACTIVE)
  isEnabled    Boolean             @default(true)  // clinic's own on/off switch — see Section 4

  purchasedAt       DateTime  @default(now())
  currentPeriodEnd  DateTime?          // null for ONE_TIME
  cancelAtPeriodEnd Boolean   @default(false)

  stripeSubscriptionId  String?  // set for MONTHLY / YEARLY
  stripePaymentIntentId String?  // set for ONE_TIME

  grantedByAdmin Boolean @default(false)  // true if a Super Admin comped this instead of a real purchase

  clinic Clinic @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  plugin Plugin @relation(fields: [pluginId], references: [id])

  @@unique([clinicId, pluginId])
}
```

---

## 2. The three plugins — what each one actually turns on

### 2.1 Video Consultation (`video-consultation`)

- Adds `Appointment.visitType: "IN_PERSON" | "VIDEO"` (nullable/defaulted to `IN_PERSON` when
  the plugin isn't active, so the column can exist platform-wide without affecting non-buyers).
- On booking a `VIDEO` appointment, create a `roomId` via a hosted video API (Daily.co or
  Twilio Video — do not build raw WebRTC).
- Appointment detail view (both clinic dashboard and, if built, the patient portal) shows a
  "Join call" button that activates 10 minutes before `time`.
- Gated UI: the "Video visit" option in the appointment-type selector only renders if this
  plugin is active+enabled for the clinic; otherwise the field defaults to `IN_PERSON` and the
  option is hidden, not disabled-and-visible.

### 2.2 Inventory Management (`inventory-management`)

```prisma
model InventoryItem {
  id               String   @id @default(cuid())
  clinicId         String
  name             String
  sku              String?
  unit             String             // "box" | "vial" | "strip" | ...
  quantityOnHand   Int      @default(0)
  reorderThreshold Int      @default(5)
  unitCost         Int?               // smallest currency unit
  createdAt        DateTime @default(now())

  clinic       Clinic                  @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  transactions InventoryTransaction[]
}

model InventoryTransaction {
  id        String   @id @default(cuid())
  itemId    String
  change    Int                // positive = restock, negative = used
  reason    String             // "RESTOCK" | "USED_IN_VISIT" | "ADJUSTMENT"
  recordId  String?            // optional link to the MedicalRecord it was used in
  createdAt DateTime @default(now())

  item InventoryItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
}
```

- New dashboard nav item **Inventory** — only rendered in the sidebar if this plugin is
  active+enabled for the clinic.
- Overview page gets a "Low stock" panel (items where `quantityOnHand <= reorderThreshold`) —
  only rendered if the plugin is active, otherwise Overview looks exactly as it does today.

### 2.3 E-Prescriptions (`e-prescriptions`)

```prisma
model Prescription {
  id           String   @id @default(cuid())
  clinicId     String
  patientId    String
  recordId     String?            // optional link back to a MedicalRecord
  doctorId     String
  date         DateTime @db.Date
  items        Json               // [{ drug, dosage, frequency, durationDays, notes }]
  createdAt    DateTime @default(now())

  clinic  Clinic  @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  patient Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
  doctor  Doctor  @relation(fields: [doctorId], references: [id])
}
```

- Without this plugin, `MedicalRecord.prescription` stays the plain free-text field it already
  is (core, unaffected, works for everyone).
- With this plugin active, the Medical Records "New record" modal gains a structured
  prescription builder (drug autocomplete + dosage/frequency/duration rows, same repeatable-row
  UI pattern as the Invoice line-items form) that saves to `Prescription` and renders as a
  branded, printable PDF.

---

## 3. Admin: Plugins page (`/admin/plugins`)

New nav item in the admin sidebar, positioned between **Plans** and **Promotions** (it's the
same "monetization config" family, but visually distinct — use a `Puzzle` icon in the nav to
read as clearly different from Plans at a glance).

**List page:** table — Name, Category, Pricing models offered (chips: `One-time` / `Monthly` /
`Yearly`, whichever are set), Active toggle, Clinics using it (count), Actions (kebab menu,
using the shared Radix `DropdownMenu` fix from the UI rebuild spec).

**Row actions:** Edit, Toggle Active (non-destructive, instant), Archive (`ConfirmDialog`,
explains existing purchasers keep access, it just stops being purchasable by new clinics).

**Create / Edit form (`/admin/plugins/new`, `/admin/plugins/[pluginId]`):**

Two-column layout, same pattern as the Plan Builder:

**Left — basics:** Name, Slug, Tagline, Description, Category, Icon (searchable lucide-react
icon picker), Active toggle, Sort order.

**Right — pricing:** three collapsible sections, one per `PluginPricingModel`
(`One-time` / `Monthly` / `Yearly`), each with a checkbox to enable that model for this plugin
and, when enabled, two price fields (INR, USD) side by side. A plugin can offer any combination
— e.g. Video Consultation might be Monthly + Yearly only, Inventory Management might be
One-time + Monthly, E-Prescriptions might offer all three. This mirrors exactly how the pricing
research earlier in this conversation treated one-time vs. recurring differently per feature —
don't force every plugin into the same pricing shape.

**Live preview** (full width, below both columns): renders the actual `PluginCard` component
(Section 5) exactly as it will appear on the landing page and in the clinic's Add-ons page,
showing whichever pricing models are currently checked, in both currencies side by side (or
toggled — match whatever currency-switcher pattern you build for Plans).

Saving price changes follows the same rule as Plan price changes in `CHARTWELL_ADMIN_SPEC.md`
Section 5: Stripe prices are immutable, so a price edit creates a new Stripe Price and updates
the relevant `stripePriceId*` field; existing purchasers on a recurring plugin keep their
original price until they cancel and repurchase.

### 3.1 Manually granting a plugin (from Clinic detail page)

Same pattern as `GrantPromoModal` in `CHARTWELL_ADMIN_SPEC.md` Section 6.4: a **Grant plugin**
action on `/admin/clinics/[clinicId]` opens a modal — select plugin, select pricing model (for
audit clarity even though it's free), confirm → creates a `ClinicPlugin` with
`grantedByAdmin: true`, no Stripe records, `status: ACTIVE`. Used for demos, support
compensation, or sales trials. Writes an `AuditLogEntry`.

---

## 4. Clinic side: buying and activating a plugin

### 4.1 New dashboard nav item: Add-ons

Insert into the clinic dashboard sidebar (from `CHARTWELL_BUILD_SPEC.md` Section 6) between
**Billing** and **Records**:

```
{ key: "addons", label: "Add-ons", icon: Puzzle }
```

### 4.2 Add-ons page (`/dashboard/addons`)

Two sections:

**Available plugins** — cards for every active `Plugin` the clinic hasn't purchased yet. Each
card: icon, name, tagline, pricing (shows all offered models — e.g. "₹999/mo or ₹9,990/yr"),
and a **"Add to your clinic"** button.

Clicking it opens a small `PurchaseModal`: pick pricing model (radio, only the models the
plugin actually offers), currency is inferred from the clinic's region setting (set at
onboarding — see `CHARTWELL_BUILD_SPEC.md` Section 5.1) but shows a link to switch it, then:
- `ONE_TIME` → `POST /api/stripe/plugin-checkout` with `mode: "payment"` → Stripe Checkout →
  webhook creates the `ClinicPlugin` row.
- `MONTHLY` / `YEARLY` → same endpoint, `mode: "subscription"` → webhook creates the
  `ClinicPlugin` row with `stripeSubscriptionId` and `currentPeriodEnd`.

**Your add-ons** — cards for every `Plugin` this clinic has an `ACTIVE` or `CANCELED`
(not-yet-expired) `ClinicPlugin` for. Each card shows: purchase date, pricing model, renewal
date (if recurring), and:
- An **enable/disable switch** bound to `ClinicPlugin.isEnabled` — this is separate from
  billing. Disabling hides the plugin's UI (nav item, form fields) without canceling a paid
  subscription — useful for a clinic that wants to pause using a feature without losing their
  purchase. Toggling this is instant, no dialog needed (non-destructive, reversible).
- For recurring plugins: a **"Manage billing"** link to the Stripe Customer Portal (same portal
  used for plan billing — plugin subscriptions are just additional subscriptions/items on the
  same Stripe customer) to cancel or change payment method.
- For one-time plugins: no billing management needed, just the enable/disable switch — it's
  paid once, access doesn't expire.

### 4.3 Feature gating helper

One shared helper, used everywhere a plugin-gated UI element needs to check itself:

```ts
// lib/plugins.ts
export async function hasActivePlugin(clinicId: string, slug: string): Promise<boolean> {
  const cp = await db.clinicPlugin.findFirst({
    where: { clinicId, plugin: { slug }, status: "ACTIVE", isEnabled: true },
  });
  return !!cp;
}
```

Every plugin-gated nav item, form field, or button calls this (server-side, in the relevant
layout or page) before rendering. When it's `false`, don't just hide the feature silently —
render an **upsell card** in its place using the existing `cw-empty` pattern (amber accent
instead of the neutral gray empty state) with a one-line pitch and a **"View this add-on"**
button linking to `/dashboard/addons`. E.g. the Inventory nav item, if the plugin isn't active,
still appears in the sidebar but routes to an upsell page instead of disappearing — a clinic
should discover what they're missing, not have it hidden from them entirely.

### 4.4 Lifecycle / expiry handling

Extend the same cron pattern already specified for Promo expiry in `CHARTWELL_ADMIN_SPEC.md`
Section 6.5: a daily job finds every `ClinicPlugin` with `status: ACTIVE`,
`pricingModel != ONE_TIME`, and `currentPeriodEnd < now` with no successful renewal payment,
and sets `status: EXPIRED`. An expired plugin's gated UI reverts to the upsell card
automatically (Section 4.3 already handles this — `hasActivePlugin` returns `false` once
`status` isn't `ACTIVE`). Send a renewal-reminder email 3 days before `currentPeriodEnd`, same
pattern as the plan-billing reminder.

---

## 5. Landing page: Plugins section

Below the pricing section (`CHARTWELL_ADMIN_UI_REBUILD_SPEC.md` doesn't touch marketing pages,
so this slots into the existing landing page from `CHARTWELL_BUILD_SPEC.md`), add a new
section: **"Power up your clinic"** — a row of `PluginCard`s (the same component used in the
admin Plugin Builder's live preview and the clinic's Add-ons page — one component, three
places, per the project's existing rule of never building the same card twice).

Each card on the landing page shows the plugin, its pricing, and a **"Get started"** button —
if the visitor isn't logged in, it routes to `/register` with the intended plugin remembered
(store in a short-lived cookie or query param, e.g. `?intent=video-consultation`) so that right
after onboarding finishes, they land on the purchase modal for that plugin instead of the bare
dashboard. If they're logged in, it routes straight to `/dashboard/addons` with that plugin's
purchase modal pre-opened.

---

## 6. Server actions

`server/actions/plugins.ts`
- `listAvailablePlugins()` — public, used by landing page + Add-ons "Available" section.
- `purchasePlugin(pluginId, pricingModel, currency)` — creates the Stripe Checkout session
  (one-time or subscription mode depending on `pricingModel`).
- `togglePluginEnabled(clinicPluginId, enabled)` — the `isEnabled` switch from Section 4.2.

`server/actions/admin/plugins.ts` (admin-only, same guard/audit pattern as
`CHARTWELL_ADMIN_SPEC.md` Section 12)
- `createPlugin`, `updatePlugin`, `archivePlugin`
- `grantPluginToClinic(clinicId, pluginId, pricingModel)`
- `revokePluginFromClinic(clinicPluginId)` — `ConfirmDialog`, writes `AuditLogEntry`

`api/stripe/plugin-webhook` (or extend the existing plan webhook route to also handle plugin
line items — either works, but keep the logic branches clearly separated by checking
`session.metadata.type === "plugin"` vs `"plan"`)

---

## 7. Build order

1. `Plugin` / `ClinicPlugin` models + migration. Seed the three plugins (inactive by default
   until pricing is finalized in admin).
2. `hasActivePlugin()` helper + the upsell-card pattern (Section 4.3) — build this before any
   plugin's actual feature UI, so every plugin ships gated from day one.
3. Admin `/admin/plugins` list + create/edit builder with live preview (Section 3).
4. Stripe plugin checkout (one-time and subscription modes) + webhook handling + the lifecycle
   cron (Section 4.4).
5. Clinic `/dashboard/addons` page — Available + Your add-ons sections, purchase modal, enable/
   disable switch.
6. Build the three plugins' actual functionality behind their gates, one at a time:
   6a. Inventory Management (self-contained, no dependency on external APIs — build first).
   6b. E-Prescriptions (depends on existing Medical Records UI, extend it).
   6c. Video Consultation (depends on a third-party video API integration — build last since
       it needs an external account/API key).
7. Landing page Plugins section + the intent-carrying signup flow (Section 5).
8. Admin `Grant plugin` action on the Clinic detail page (Section 3.1).
