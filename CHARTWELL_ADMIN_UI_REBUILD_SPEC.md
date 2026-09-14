# Chartwell Admin — UI Rebuild & Control Center Specification

## 0. What's actually wrong right now

Looking at the current build: it's functionally wired up (data is flowing, routes exist) but
it does not read as "Chartwell" and it does not read as an admin panel with real control. Four
concrete problems, in order of severity:

1. **None of the brand tokens from Section 1 of `CHARTWELL_BUILD_SPEC.md` were applied.** The
   screenshots show default indigo/slate (shadcn's out-of-the-box theme) — indigo buttons,
   indigo badges, plain white cards, generic sans-serif everywhere. There is zero forest green,
   amber, or the ledger/serif character that makes this "Chartwell" instead of a template.
2. **The row-action menu (three dots) is built as an inline `position: relative` dropdown
   inside the table row**, so it gets clipped by the table's own boundaries — on the last row
   it renders half off-screen or gets cut by the container edge, exactly what's shown in
   Images 2 and 3. This is a component architecture problem, not a styling problem, and it
   needs a real fix (Section 2), not a z-index patch.
3. **Pages are flat lists with no real "control" affordance.** Overview is four stat cards and
   two tables — there's no sense that this is a cockpit. Plans/Promotions have no visual
   builder, just raw form fields. Settings is a single credentials form — it should be the
   single most powerful page in the whole app and right now it's the emptiest one.
4. **No feature-flag / kill-switch system exists anywhere.** There's no way for a Super Admin
   to turn a module on/off platform-wide, put the app in maintenance mode, or control which
   features a plan actually includes beyond a free-text bullet list.

This document fixes all four. It assumes `CHARTWELL_BUILD_SPEC.md` and
`CHARTWELL_ADMIN_SPEC.md` as prior context — read those first. This file **overrides** any
conflicting UI detail in those two (e.g. the plain feature-bullet-list plan form is replaced by
the Feature Builder in Section 4).

---

## 1. Non-negotiable: re-apply the design system

Before touching any page layout, fix the foundation:

- `tailwind.config.ts` and `globals.css` must contain the exact token set from
  `CHARTWELL_BUILD_SPEC.md` Section 1 (`ink`, `paper`, `forest`, `moss`, `amber`, `coral`,
  `blue`, `success`). Grep the codebase for `indigo`, `slate`, `zinc`, `blue-600` and any other
  default Tailwind/shadcn color utility and replace every instance with the Chartwell tokens.
- Fraunces for headings (`Admin Panel`, page titles like `Platform Overview`, the big numbers
  on stat cards), Inter for everything else, JetBrains Mono for IDs/dates/currency — same rule
  as the clinic dashboard, not relaxed for admin.
- The admin shell keeps `forest-dark` as the sidebar background (already close in the current
  build) but every accent color inside the content area (badges, buttons, active nav state,
  links) must come from the token set — not indigo.
- Distinguish "admin mode" from "clinic mode" the way the original spec intended: a **1–2px
  coral top strip** across the very top of the admin shell (above the topbar), so a Super
  Admin always has a persistent, subtle visual cue they're in the control room. This does not
  exist in the current build at all.

---

## 2. Fix: the row-action menu

Replace whatever custom dropdown is currently implemented with a proper portal-based menu
primitive — **Radix UI's `DropdownMenu`** (or Headless UI `Menu` / `floating-ui` if you prefer,
but Radix is the standard pairing with shadcn and handles this correctly out of the box).

Why the current one breaks: it's positioned `absolute` relative to a `position: relative`
table row/cell, so its rendered box is constrained by the table's own stacking context and
gets clipped by the table wrapper's edges — especially on the last visible row, exactly as
shown in Images 2 and 3.

The fix, structurally:

```tsx
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild>
    <button className="cw-btn-ghost cw-btn-icon"><MoreVertical size={16} /></button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      align="end"
      sideOffset={6}
      collisionPadding={12}
      className="z-50 min-w-[180px] rounded-lg border border-line bg-paper-raised shadow-lg p-1"
    >
      <DropdownMenu.Item className="menu-item" onSelect={onSuspend}>
        <Ban size={14}/> Suspend clinic
      </DropdownMenu.Item>
      <DropdownMenu.Item className="menu-item text-coral" onSelect={onDelete}>
        <Trash2 size={14}/> Delete clinic
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
```

Because `DropdownMenu.Portal` renders to `document.body` and Radix's Popper positioning
(`collisionPadding`, automatic flip/shift) keeps the menu inside the viewport regardless of
which row triggered it, this single change fixes "opens inside the table and gets clipped" for
every table in the admin panel — Clinics, Users, Plans, Promotions, Payments — without
per-page special-casing. **Apply this one component everywhere a kebab menu exists.** Do not
build a second, different dropdown implementation for any other page.

Additionally: the table wrapper itself should only ever use `overflow-x: auto` (for horizontal
scroll on narrow viewports) and never `overflow: hidden` — the portal fix makes this less
critical, but a hidden overflow on the wrapper can still clip non-portaled content, so remove
it regardless.

---

## 3. Page-by-page redesign

Same information architecture as `CHARTWELL_ADMIN_SPEC.md`, but each page gets real visual
structure instead of a bare table. Apply the `Panel` / `StatCard` / `Badge` / `Chip` components
already defined in the core spec — the admin panel reuses the exact same component library as
the clinic dashboard, just re-themed with the coral top strip.

### 3.1 Overview
- Keep the 4 stat cards but restyle with the real tokens (icon chips in forest/amber/blue/coral
  tints, not the current flat pastel squares) and add the "Needs attention" panel from
  `CHARTWELL_ADMIN_SPEC.md` Section 2 — this is currently missing entirely.
- Add the signups trend `AreaChart` (Section 2 of the admin spec) — currently there is no chart
  on this page at all, just tables.
- Recent Clinics / Recent Users panels stay, but their status/role badges must use the
  `StatusBadge` component with real tokens (green/coral/amber pill styling, not a flat gray/
  indigo chip).

### 3.2 Clinics
- Table stays but every row's kebab menu uses the Section 2 fix.
- Add the filter chip row from the admin spec (status filter, plan filter, search) above the
  table — currently there's only a search box and no status/plan filtering.
- Clicking a clinic name (not just a hidden "View" menu item) should navigate to the detail
  page — make the whole name+slug cell a link.
- Clinic detail page (`/admin/clinics/[clinicId]`) needs to actually exist with the full layout
  from the admin spec Section 3.1 (profile panel, members table, subscription panel, activity
  summary) — build it if it's currently just a stub or missing.

### 3.3 Users
- Same table + portal-menu fix.
- Add the platform-role filter chips (`All` / `Super Admin` / `User`) above the table.
- "Deactivate User" needs the `ConfirmDialog` from the admin spec Section 0 — right now it's
  just a menu item with no visible confirmation step in the screenshots.

### 3.4 Plans — see Section 4 below, this page changes the most.

### 3.5 Promotions — see Section 4 below.

### 3.6 Payments
- Build this page fully per admin spec Section 9 — table with clinic, amount (mono, right
  aligned), status badge, date, Stripe link. Add date-range and status filters.

### 3.7 Audit Log
- Build fully per admin spec Section 10 — this is currently missing from the nav entirely in
  the screenshots (it's in the nav list but not shown built). Table: Actor, Action (as a
  `Chip`, colored by action type — suspensions/deletes in coral, grants/creates in forest,
  neutral edits in blue), Target (link to the target record), Timestamp, expandable row for
  `metadata` JSON (click row to expand inline, don't navigate away).

### 3.8 Settings — becomes the Control Center, see Section 5.

---

## 4. New: global Feature Catalog + visual Plan Builder

Replace the free-text-only "Features (bullet points)" field from `CHARTWELL_ADMIN_SPEC.md`
Section 5 with a real catalog so features are consistent across plans and individually
controllable.

### 4.1 Data model additions

```prisma
model Feature {
  id                String   @id @default(cuid())
  key               String   @unique   // "appointments.calendar", "billing.invoices"
  name              String             // "Appointment calendar"
  description       String?
  category          String             // "Core" | "Scheduling" | "Billing" | "Communication" | "Support"
  isGloballyEnabled Boolean  @default(true)  // platform-wide kill switch — see Section 5
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  planFeatures PlanFeature[]
}

model PlanFeature {
  id        String  @id @default(cuid())
  planId    String
  featureId String
  included  Boolean @default(true)

  plan    Plan    @relation(fields: [planId], references: [id], onDelete: Cascade)
  feature Feature @relation(fields: [featureId], references: [id], onDelete: Cascade)

  @@unique([planId, featureId])
}
```

`Plan.features` (the `String[]` in the original schema) becomes **generated, not hand-typed**:
keep an optional `Plan.extraBullets: String[]` for marketing-only lines that aren't real
toggleable product features (e.g. "Priority email support", "Dedicated onboarding call"). The
pricing card renders: catalog features marked `included: true` for that plan (in category
order), then `extraBullets` appended after.

### 4.2 Feature Catalog management (`/admin/settings` → Feature Catalog tab, see Section 5)

A simple CRUD list: Name, Key, Category, Globally enabled toggle, used-in-N-plans count.
Creating a feature here is what makes it available to check off in the Plan Builder — this is
the master list.

### 4.3 Plan Builder (`/admin/plans/new`, `/admin/plans/[planId]`)

Redesign this page as an actual builder, two-column layout:

**Left column — plan basics:** Name, Slug, Description, Monthly/Yearly price, Currency,
Patient limit, Doctor limit, Featured toggle, Active toggle, Is-default-free toggle, Sort
order. (Same fields as the admin spec, just restyled with real tokens — this part of the
current build is closest to correct already, per Image 5.)

**Right column — Feature Builder:** the global Feature catalog rendered as **grouped
checklists** by category (Core, Scheduling, Billing, Communication, Support), each feature a
row with a checkbox + name + description tooltip. Checking a box creates/toggles a
`PlanFeature`. Below the checklist, a small "Additional bullets" repeatable text-input list for
`extraBullets` (same add/remove pattern as before, just renamed and demoted to a secondary
role).

**Live preview panel** (full width, below both columns): renders the actual `PricingCard`
component with everything selected so far — this doesn't currently exist for Plans at all
(it does for Promotions, per Image 6 — bring that same pattern here).

### 4.4 Promotions page

Structurally this one is closer to right already (Image 6 shows a working two-column
form + live preview) — just re-theme it with the real tokens (the amber "LIMITED TIME OFFER"
badge and dark forest preview card in Image 6 actually already look correct because the
preview renders the real `PromoBanner`/`OnboardingPromoCard` components — the surrounding form
chrome (labels, inputs, page background) is what still needs the token pass). Add the empty
state for the list page (Image 7 is currently a bare header with no empty-state messaging) —
use the standard `cw-empty` pattern: icon, "No promotions yet", one line of guidance, and the
"Create Promo" button repeated inline.

---

## 5. Settings → the Control Center

This is the biggest structural change. Settings stops being a single credentials form (Image 8)
and becomes a tabbed control center — the one place a Super Admin can turn any part of the
platform on or off without a deploy.

**Tabs:**

### 5.1 Feature Flags
Platform-wide kill switches, grouped by area, each a labeled toggle with a description and an
"Off since [date] by [admin]" note when disabled (pulled from the Audit Log). New model:

```prisma
model PlatformFlag {
  id          String   @id @default(cuid())
  key         String   @unique  // "PUBLIC_REGISTRATION" | "PROMOTIONS_MODULE" | "STRIPE_CHECKOUT" | "MAINTENANCE_MODE" | ...
  label       String
  description String
  category    String   // "Access" | "Billing" | "Modules" | "Platform"
  enabled     Boolean  @default(true)
  updatedAt   DateTime @updatedAt
}
```

Seed rows (extend freely as the product grows):

| Key | Label | Category | Effect when off |
|---|---|---|---|
| `PUBLIC_REGISTRATION` | New clinic signups | Access | `/register` shows a "Signups are temporarily paused" page instead of the form |
| `PROMOTIONS_MODULE` | Promotions engine | Modules | No promo banner/redemption anywhere, even if a Promo row is Live |
| `STRIPE_CHECKOUT` | Paid checkout | Billing | Only the default free plan is selectable platform-wide; paid plan buttons show "Contact us" |
| `PATIENT_SELF_EXPORT` | Clinic data export | Modules | Hides the "Export clinic data" button in clinic Settings |
| `MAINTENANCE_MODE` | Maintenance mode | Platform | Every non-admin route shows a maintenance page; `/admin` stays accessible |

Toggling any flag writes an `AuditLogEntry` and uses the standard `ConfirmDialog` (tone:
danger for anything that blocks user access, like `MAINTENANCE_MODE` or
`PUBLIC_REGISTRATION`).

### 5.2 Feature Catalog
The CRUD list from Section 4.2 — create/edit/toggle the global features used by the Plan
Builder.

### 5.3 Plans & Billing defaults
Default free plan selector, default trial length for organic paid signups, default currency,
Stripe mode indicator (Test/Live, read-only, reflects the API key in use).

### 5.4 Branding
Admin panel display name (currently hardcoded "Chartwell Super Admin" — make it editable),
support email shown on suspended/expired screens, platform logo upload (optional, can stub as
a URL field if file upload isn't wired yet).

### 5.5 Account
The existing credentials form from Image 8 moves here as a sub-tab — it doesn't disappear, it
just stops being the *entire* Settings page.

### 5.6 Danger Zone
Visually separated (coral border, warning icon), bottom of the Settings nav: Maintenance mode
toggle repeated here for visibility, "Reset demo data" (dev/staging only — hide in production
if you add an environment check), and any irreversible platform-level actions that get added
later.

---

## 6. Responsive rules for the admin panel

The current build shows no evidence of a mobile layout. Apply the same breakpoint discipline as
the clinic dashboard:

- Sidebar collapses behind a hamburger under ~980px, same slide-in pattern as the clinic app.
- Tables get `overflow-x: auto` on their wrapper (not the page) below ~760px, so row actions
  stay reachable via horizontal scroll rather than breaking layout.
- Stat card grids drop from 4 → 2 → 1 columns at the existing breakpoints.
- The Plan Builder's two-column layout (Section 4.3) stacks to one column with the live
  preview moved to the bottom on screens under ~980px.

---

## 7. Build order for this pass

This is a **repair pass** on an existing build, not a rewrite — sequence it to fix the worst
problems first:

1. Token pass: `tailwind.config.ts`, `globals.css`, sweep every admin component for hardcoded
   indigo/slate classes and replace with tokens. Add the coral top strip to the admin shell.
2. Replace every kebab/dropdown menu with the Radix `DropdownMenu` pattern from Section 2 —
   one shared component, used identically on every table.
3. Add `PlatformFlag` model + seed rows + the Feature Flags tab in Settings (Section 5.1) —
   this unblocks "make things go live/not live" immediately, even before the rest of Settings
   is built out.
4. Add `Feature` / `PlanFeature` models + Feature Catalog CRUD (Section 4.2).
5. Rebuild the Plan Builder page with the checklist + live preview (Section 4.3).
6. Restyle Promotions form chrome to match tokens (Section 4.4) — the preview logic already
   works, just needs the surrounding UI re-themed.
7. Build out Clinic detail, Payments, and Audit Log pages fully (Sections 3.2, 3.6, 3.7) if
   they're currently stubs.
8. Finish Settings tabs 5.2–5.6.
9. Responsive pass across every admin page (Section 6).
