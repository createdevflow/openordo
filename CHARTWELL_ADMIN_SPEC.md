# Chartwell Admin Panel — Full Specification

Scope: this document covers **only** `/admin` (Super Admin) plus the two places outside admin
that must read admin-configured data dynamically — the **landing page pricing section** and
the **onboarding plan step**. Everything else (clinic-facing dashboard) is covered in
`CHARTWELL_BUILD_SPEC.md`; this file extends it.

---

## 0. Interaction rules (apply to every page below)

These are non-negotiable, platform-wide rules for the admin panel:

- **No native browser dialogs, ever.** No `window.alert()`, `window.confirm()`, or
  `window.prompt()` anywhere in the app, admin or otherwise.
- **Every destructive or state-changing action opens a `ConfirmDialog`** (a modal, styled
  with the existing design tokens — coral accent for destructive actions, forest/amber for
  neutral ones) before it executes. The dialog states plainly what will happen, shows the
  specific record's name, and requires an explicit confirm click.
- **Every completed action shows a `Toast`**, bottom-center, auto-dismissing — same component
  already used in the clinic dashboard. Success = forest/success styling with a check icon.
  Failure = coral styling with the error message from the server action.
- **Every form action (create/edit) opens in a `Modal` or a dedicated page** — never inline
  editing with no save step, so nothing changes without an explicit action.
- **Two-step confirmation for the most dangerous actions** (deleting a clinic, demoting the
  last Super Admin): the `ConfirmDialog` requires typing the record's name/slug into a text
  field before the confirm button un-disables.

Build one shared `<ConfirmDialog />` component and one `useConfirm()` hook so every page below
calls the same thing instead of reinventing it:

```tsx
const { confirm } = useConfirm();

async function handleSuspend(clinic: Clinic) {
  const ok = await confirm({
    title: `Suspend ${clinic.name}?`,
    body: "Their team will be signed out and see a suspended-account screen until you reactivate them. Data is not deleted.",
    confirmLabel: "Suspend clinic",
    tone: "danger", // "danger" | "neutral" | "primary"
  });
  if (!ok) return;
  const result = await suspendClinic(clinic.id);
  toast(result.ok ? "Clinic suspended" : result.error, { tone: result.ok ? "success" : "error" });
}
```

---

## 1. Admin navigation

Sidebar (same shell pattern as the clinic dashboard, forest-dark background, but the top of
the sidebar carries a thin **coral** strip and the label "Chartwell Admin" so it's never
visually confused with a clinic account):

- Overview
- Clinics
- Users
- Plans
- Promotions
- Payments
- Audit Log
- Admin Settings

---

## 2. Overview (`/admin`)

**Purpose:** platform health at a glance.

**Cards:** Active clinics, Trialing clinics, MRR (sum of active subscriptions' plan price,
converted to monthly), Signups this week, Active promo redemptions.

**Chart:** signups per day, last 30 days (reuse the `AreaChart` pattern).

**Panel:** "Needs attention" — a live list pulled from data, not manually curated:
past-due subscriptions, trials ending in the next 3 days, promo redemptions expiring in the
next 3 days. Each row has a **View** action that deep-links to the relevant Clinic detail page.

No destructive actions on this page — it's read-only.

---

## 3. Clinics (`/admin/clinics`)

**Table columns:** Clinic name, Type, Owner (name + username), Plan, Subscription status,
Patients, Created date.

**Filters:** status (`Active` / `Trialing` / `Past due` / `Canceled` / `Suspended`), plan,
search by name/owner/username.

**Row actions (kebab menu):**

| Action | Flow |
|---|---|
| **View** | Navigates to `/admin/clinics/[clinicId]` |
| **Suspend** | `ConfirmDialog` (tone: danger) → `suspendClinic(id)` → toast → row status updates to `Suspended` |
| **Reactivate** | `ConfirmDialog` (tone: primary) → `reactivateClinic(id)` → toast |
| **Change plan** | Opens `ChangePlanModal`: dropdown of active `Plan`s + reason text field (logged to Audit Log) → `changeClinicPlan(id, planId, reason)` → toast |
| **Extend trial / grant promo** | Opens `GrantPromoModal` (see Section 6.4) |
| **Delete clinic** | Two-step `ConfirmDialog` (type clinic slug to confirm) → `deleteClinic(id)` → toast → row removed |

### 3.1 Clinic detail (`/admin/clinics/[clinicId]`)

Sections: Profile (name, type, address, phone, created date), Members table (name, username,
role, joined date — with a **Remove member** action per row, `ConfirmDialog`), Subscription
panel (current plan, status, billing cycle, current period end, promo status if any, Stripe
customer link), Activity summary (patient/appointment/invoice counts).

Page-level actions: same Suspend / Reactivate / Change plan / Grant promo / Delete as the table
row, plus **Transfer ownership** (select a different member to become `OWNER`, `ConfirmDialog`).

---

## 4. Users (`/admin/users`)

**Table columns:** Username, Name, Email, Clinic(s), Platform role, Joined date.

**Filters:** platform role, search by name/username/email.

**Row actions:**

| Action | Flow |
|---|---|
| **View** | `/admin/users/[userId]` — profile, memberships, login history if tracked |
| **Promote to Super Admin** | `ConfirmDialog` (tone: primary), explains scope of access being granted → `promoteToSuperAdmin(id)` → toast |
| **Demote to User** | `ConfirmDialog` (tone: danger). If this is the last remaining Super Admin, the action is blocked server-side and the dialog shows an inline error instead of submitting — never a native alert |
| **Deactivate account** | `ConfirmDialog` — signs the user out of all sessions and blocks login, does not delete data → `deactivateUser(id)` → toast |

---

## 5. Plans (`/admin/plans`)

This is what makes pricing dynamic. The landing page and onboarding never hardcode a price —
they render whatever is in this table.

**List page (`/admin/plans`):** table of all `Plan` rows — Name, Monthly price, Yearly price,
Patient limit, Featured (badge), Active (toggle), Sort order. Drag-to-reorder updates
`sortOrder` directly (no confirm needed, it's non-destructive — just a toast: "Order updated").

**Row actions:**

| Action | Flow |
|---|---|
| **Edit** | Opens `/admin/plans/[planId]` |
| **Toggle Active** | Inline switch, no dialog (non-destructive, instantly reversible) → toast "Practice plan is now hidden from pricing" / "...now visible" |
| **Archive** | `ConfirmDialog` — explains existing subscribers are unaffected, but new signups can no longer pick it → `archivePlan(id)` → toast |

**Create / Edit form (`/admin/plans/new`, `/admin/plans/[planId]`):**

Fields: Name, Slug (auto from name, editable), Description, Monthly price, Yearly price,
Currency, Patient limit (blank = unlimited), Doctor limit (blank = unlimited), Feature list
(repeatable text rows with add/remove — this list is exactly what renders as the bullet list
on the pricing card), Featured toggle ("Most popular" ribbon), Active toggle, Sort order.

On save:
- If monthly/yearly price changed and the plan already has a live Stripe price, the server
  action creates a **new** Stripe Price (prices are immutable in Stripe) and updates
  `stripePriceIdMonthly` / `stripePriceIdYearly` — existing subscribers keep their old price
  until they change plans; new checkouts use the new price. Show this explicitly in the UI as
  a note under the price fields: *"Changing the price creates a new rate for future signups.
  Existing subscribers keep their current price until they switch plans."*
- Toast: "Plan saved" / on error, the specific validation message.

---

## 6. Promotions (`/admin/promotions`)

New section. This is the engine behind "give new clinics our top plan free for a limited time."

### 6.1 Data model

```prisma
enum PromoEligibility {
  NEW_CLINICS_ONLY   // only clinics signing up after the promo starts
  ALL_CLINICS        // any clinic, including existing ones (e.g. a win-back offer)
}

model Promo {
  id              String            @id @default(cuid())
  name            String            // internal label, e.g. "Launch week — Practice free trial"
  targetPlanId    String            // which Plan gets unlocked
  durationDays    Int               // how many days of free access
  eligibility     PromoEligibility  @default(NEW_CLINICS_ONLY)
  startsAt        DateTime?
  endsAt          DateTime?
  isActive        Boolean           @default(true)
  redemptionLimit Int?              // null = unlimited
  redemptionCount Int               @default(0)
  headline        String            // customer-facing, e.g. "Try Practice free for 14 days"
  subtext         String?           // e.g. "No card required. Automatically moves to Starter after your trial."
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  targetPlan  Plan              @relation(fields: [targetPlanId], references: [id])
  redemptions PromoRedemption[]
}

model PromoRedemption {
  id         String   @id @default(cuid())
  promoId    String
  clinicId   String
  redeemedAt DateTime @default(now())
  expiresAt  DateTime

  promo  Promo  @relation(fields: [promoId], references: [id])
  clinic Clinic @relation(fields: [clinicId], references: [id])

  @@unique([promoId, clinicId])
}
```

Also extend `Subscription`:

```prisma
model Subscription {
  // ...existing fields from CHARTWELL_BUILD_SPEC.md
  promoId        String?
  promoExpiresAt DateTime?
}
```

### 6.2 List page (`/admin/promotions`)

Table: Name, Target plan, Duration, Eligibility, Redemptions (`count` / `limit or "∞"`),
Status badge (`Scheduled` / `Live` / `Ended` / `Paused`, computed from `startsAt`/`endsAt`/
`isActive`), Actions.

**Only one promo can be "Live" for `NEW_CLINICS_ONLY` at a time** — enforced server-side.
Activating a second one shows an inline warning in the dialog: *"[Existing promo] is currently
live for new signups. Activating this one will end it immediately."* with a confirm to proceed.

**Row actions:**

| Action | Flow |
|---|---|
| **Edit** | `/admin/promotions/[promoId]` |
| **Pause** | `ConfirmDialog` (tone: neutral) — stops new redemptions, existing redemptions keep running until their own `expiresAt` → toast |
| **Resume** | Same conflict check as activation above |
| **End now** | `ConfirmDialog` (tone: danger) — immediately expires all active redemptions for this promo (their clinics move to the default free plan on next check) → toast |
| **Delete** | Only allowed if `redemptionCount === 0`; otherwise the action is disabled with a tooltip explaining why, not a dialog that fails on submit |

### 6.3 Create / Edit form

Fields: Name (internal), Target plan (dropdown of active Plans, excluding the free plan),
Duration (days), Eligibility (`New clinics only` / `All clinics`), Start date (optional —
blank means "starts immediately on activation"), End date (optional — blank means "runs until
manually paused"), Redemption limit (optional), **Headline** (this exact string is what
renders on the landing page banner and onboarding promo card), **Subtext** (optional, smaller
supporting line), Active toggle.

A live preview panel on the right of the form renders the actual `PromoBanner` and
`OnboardingPromoCard` components with the entered headline/subtext/plan, so the admin sees
exactly what a new visitor will see before publishing.

### 6.4 Grant promo to a specific clinic (from Clinics page)

`GrantPromoModal`: select an existing Promo (or pick "Custom") → if custom, a small inline
form (target plan, duration days) → confirm → creates a `PromoRedemption` directly for that
clinic, bypassing eligibility checks (this is the manual override path for support/sales).
Toast: "Riverside Family Clinic now has Practice free until 22 Sep."

### 6.5 Promo lifecycle logic (server-side, not a page — document it here since it's the core
mechanic)

- **On registration / onboarding plan step:** server looks up the single currently-`Live`
  promo with `eligibility: NEW_CLINICS_ONLY` (or `ALL_CLINICS`). If found and under its
  redemption limit, the onboarding UI shows the promo path instead of the standard picker
  (Section 7).
- **On redemption (user accepts the promo):** create `PromoRedemption` with
  `expiresAt = now + durationDays`, create/update `Subscription` with `planId = targetPlanId`,
  `status: ACTIVE`, `promoId`, `promoExpiresAt`, increment `Promo.redemptionCount`. No Stripe
  involved — this is a free trial, not a paid checkout.
- **Expiry check:** a scheduled job (Vercel Cron hitting an internal route, e.g. daily) finds
  every `Subscription` where `promoExpiresAt < now` and `status = ACTIVE` with a `promoId` set,
  and downgrades it: `planId` → the default free `Plan` (flag one plan as
  `isDefaultFree: true` — add this boolean to `Plan`), clears `promoId`/`promoExpiresAt`, sends
  an email ("Your free trial of Practice has ended — you're now on Starter"). Also show an
  in-app banner in the clinic dashboard for the 3 days leading up to expiry: *"Your free trial
  of Practice ends in 2 days. [Add a payment method]"* linking to the billing portal.

---

## 7. Onboarding changes (plan-selection step)

Update `app/onboarding/plan/page.tsx`:

1. Server-fetch the active `NEW_CLINICS_ONLY` promo (if any) alongside the plan list.
2. **If an active promo exists:**
   - Show a single large **`OnboardingPromoCard`** instead of the default 3-card grid as the
     primary content: the promo's `headline`, `subtext`, the target plan's full feature list,
     a big primary button — *"Start free — no card required"* — and a small secondary link
     *"See all plans instead"* that reveals the normal pricing grid below (collapsed by
     default, not hidden).
   - The target plan's card, if shown in the expanded grid, carries an amber "🎉 Free for
     {durationDays} days" ribbon in place of its normal price, with the real price shown
     struck through underneath in small `ink-soft` text.
   - Accepting → calls the promo redemption action (Section 6.5), skips Stripe entirely,
     redirects straight to `/onboarding/done`.
3. **If no active promo:** identical to the original spec — the plain 3-card grid, "Starter"
   activates for free instantly, paid plans go to Stripe Checkout.

---

## 8. Landing page pricing section changes

Update the `/pricing` section (both the marketing homepage's pricing block and the standalone
`/pricing` page):

1. Server-fetch active plans **and** the currently-`Live` promo (`NEW_CLINICS_ONLY` or
   `ALL_CLINICS`).
2. **If a promo is live:** render a `PromoBanner` directly above the pricing cards — full-width,
   forest-dark background, amber accent text, the promo's `headline` large, `subtext` smaller,
   and a CTA button ("Claim this offer →") that scrolls to / triggers the register flow.
3. The target plan's card gets the same ribbon-and-strikethrough treatment described in
   Section 7 — pricing cards are rendered by one shared `<PricingCard plan={plan} promo={promo} />`
   component used identically on the landing page, `/pricing`, and the onboarding grid, so the
   promo styling never has to be built twice.
4. **If no promo is live:** cards render exactly as in `CHARTWELL_BUILD_SPEC.md` Section 1 —
   nothing extra shown.

---

## 9. Payments (`/admin/payments`)

Read-only ledger, mirrored from Stripe webhooks into a lightweight `Payment` log:

```prisma
model Payment {
  id          String   @id @default(cuid())
  clinicId    String
  amount      Int
  currency    String
  status      String   // "succeeded" | "failed" | "refunded"
  stripeInvoiceId String?
  createdAt   DateTime @default(now())

  clinic Clinic @relation(fields: [clinicId], references: [id])
}
```

Table: Clinic, Amount, Status badge, Date, Stripe invoice link (opens Stripe dashboard in a
new tab). Filter by status and date range. No mutating actions on this page — refunds happen
in Stripe directly and flow back via webhook.

---

## 10. Audit Log (`/admin/audit-log`)

Every admin action that changes state (suspend, reactivate, plan change, promo grant, role
change, delete) writes a row here automatically — this is what makes "type the name to
confirm" destructive actions defensible later.

```prisma
model AuditLogEntry {
  id          String   @id @default(cuid())
  actorUserId String        // which Super Admin did it
  action      String        // "SUSPEND_CLINIC" | "CHANGE_PLAN" | "GRANT_PROMO" | ...
  targetType  String        // "Clinic" | "User" | "Plan" | "Promo"
  targetId    String
  metadata    Json?         // e.g. { reason: "...", fromPlan: "...", toPlan: "..." }
  createdAt   DateTime @default(now())
}
```

Read-only table: Actor, Action, Target, Timestamp, expandable row for `metadata`. Filter by
actor, action type, date range.

---

## 11. Admin Settings (`/admin/settings`)

Platform-wide config that isn't a Plan or Promo:

- Default free plan selector (which `Plan.isDefaultFree` a clinic falls back to after a promo
  or subscription ends) — dropdown + `ConfirmDialog` since it affects future downgrades.
- Default trial length for organic (non-promo) signups on paid plans, if you offer one, in
  days.
- Support email shown in suspended-account and expired-trial screens.
- Toggle: allow self-serve Super Admin invites (off by default — promoting a user is manual,
  per Section 4).

---

## 12. Server actions summary (admin domain)

`server/actions/admin/`
- `clinics.ts` — `suspendClinic`, `reactivateClinic`, `changeClinicPlan`, `deleteClinic`,
  `transferOwnership`, `removeMember`
- `users.ts` — `promoteToSuperAdmin`, `demoteFromSuperAdmin`, `deactivateUser`
- `plans.ts` — `createPlan`, `updatePlan`, `archivePlan`, `reorderPlans`
- `promotions.ts` — `createPromo`, `updatePromo`, `pausePromo`, `resumePromo`, `endPromoNow`,
  `deletePromo`, `grantPromoToClinic`, `redeemActivePromo` (called from onboarding, not admin)
- `platform.ts` — `platformMetrics()`, `getAuditLog(filters)`, `updateAdminSettings`

Every one of these:
1. Starts with `await requireSuperAdmin()`.
2. On success, writes an `AuditLogEntry` (except read-only queries).
3. Returns `{ ok: true }` or `{ ok: false, error: string }` — never throws to the client — so
   the calling component can show a toast either way without a try/catch scattered everywhere.

---

## 13. Build order for this piece (slot into Phase 10 of the main spec)

1. `ConfirmDialog` + `useConfirm()` + `Toast` shared components (if not already built).
2. `Plan.isDefaultFree` field + seed it on the Starter plan.
3. `Promo` / `PromoRedemption` / `Payment` / `AuditLogEntry` models + migration.
4. Admin shell + Overview page (read-only, easiest to verify data plumbing).
5. Clinics + Users pages with all actions wired through `ConfirmDialog`.
6. Plans page (list + create/edit form + Stripe price versioning).
7. Promotions page (list + create/edit form + live preview + lifecycle cron route).
8. Wire `PricingCard` + `PromoBanner` into the landing page and `/pricing`.
9. Wire `OnboardingPromoCard` into the onboarding plan step.
10. Payments + Audit Log (read-only, last since nothing else depends on them).
11. Admin Settings page.
