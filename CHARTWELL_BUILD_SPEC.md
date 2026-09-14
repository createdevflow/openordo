# Chartwell — Next.js Build Specification (v2)

This is the source-of-truth handoff document for building Chartwell as a real, multi-tenant
SaaS product in Next.js. Give this whole file to your coding agent (Antigravity) as context
before it writes any code.

**Do not redesign the UI.** Section 1 is the exact design system already validated in the
v1 prototype (`ClinicCRM.jsx`). Port it into Tailwind config + `globals.css` as-is — same
colors, same type, same component shapes. Everything else in this doc (data model, routing,
admin panel, billing) is new for v2.

---

## 0. What v2 adds on top of v1

v1 was a single-clinic, in-memory demo. v2 is a real multi-tenant product:

- Real accounts (sign up / log in) with persisted data in Postgres.
- Every signup creates a **Clinic** (tenant) and a unique **username/handle** for the owner.
- Multiple staff can belong to one clinic with roles (Owner, Admin, Doctor, Front Desk).
- A separate **Super Admin panel** for the Chartwell team to manage every clinic account on
  the platform.
- **Pricing plans are rows in the database**, not hardcoded — the public pricing page and the
  in-app "upgrade" flow both read live plan data, and Super Admins can create/edit/retire
  plans without a code deploy.
- A real **checkout flow** (Stripe) to purchase/upgrade a plan, plus a billing portal.
- A guided **onboarding flow** right after registration.

---

## 1. Brand & Design System

Port these tokens exactly. This is the full palette, type system and component language from
the validated prototype — treat it as locked.

### 1.1 Color tokens

| Token | Hex | Usage |
|---|---|---|
| `ink` | `#16241F` | Primary text, dark headings |
| `ink-soft` | `#3C4A45` | Secondary text, descriptions |
| `paper` | `#F1F0EA` | App/page background |
| `paper-raised` | `#FBFAF6` | Cards, panels, inputs, modals |
| `forest` | `#1E4638` | Primary brand color — buttons, sidebar active state, links |
| `forest-dark` | `#123025` | Sidebar background, hover state on primary, dark CTAs |
| `moss` | `#5C7A67` | Muted labels, secondary icons, eyebrow text |
| `line` | `#DAD6C9` | Borders, dividers, table lines |
| `amber` | `#C8862B` | Secondary accent — highlights, "featured" plan, upgrade CTAs |
| `amber-soft` | `#F3E3C6` | Amber tinted backgrounds (badges, callouts) |
| `coral` | `#B5432F` | Destructive actions, unpaid/overdue states, errors |
| `coral-soft` | `#F3DBD3` | Coral tinted backgrounds |
| `blue` | `#386A8A` | Informational accents, "scheduled" status |
| `blue-soft` | `#DCE7EC` | Blue tinted backgrounds |
| `white` | `#FFFFFF` | — |

Status color mapping (used consistently everywhere — appointments, invoices, subscriptions):
- **Scheduled / Active / Info** → blue / blue-soft
- **Completed / Paid / Success** → a success green `#2E6B3E` on `#DCEADD`
- **Cancelled / Unpaid / Error** → coral / coral-soft
- **No-show / Warning / Trial ending** → amber / amber-soft

### 1.2 Typography

- **Display / serif** — `Fraunces` (variable, opsz 9–144). Used for: landing page headlines,
  page titles like "Welcome back", pricing amounts, auth side-panel headline, quote blocks.
- **UI / body** — `Inter`. Used for: everything else — nav, buttons, forms, tables, body copy.
- **Tabular / data** — `JetBrains Mono`. Used for: patient IDs, invoice IDs, timestamps,
  currency amounts in tables, appointment times. This is functional, not decorative — anything
  that is literally a record identifier or a number in a table uses mono.

Type scale: hero h1 `52px/1.06`, section h2 `34px`, panel/card h3 `15.5–17px`, body `14–14.5px`,
small/meta `12–13px`.

### 1.3 Shape & elevation

- Border radius: `7px` buttons/inputs, `10–14px` cards/modals/panels, `20px` pills/badges/chips.
- Borders over shadows: default to a `1px solid var(--line)` border on cards; only the
  landing-page quote block and modals use a soft shadow.
- No gradients except the single subtle area-chart fill.

### 1.4 Tailwind config

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#16241F", soft: "#3C4A45" },
        paper: { DEFAULT: "#F1F0EA", raised: "#FBFAF6" },
        forest: { DEFAULT: "#1E4638", dark: "#123025" },
        moss: "#5C7A67",
        line: "#DAD6C9",
        amber: { DEFAULT: "#C8862B", soft: "#F3E3C6" },
        coral: { DEFAULT: "#B5432F", soft: "#F3DBD3" },
        blue: { DEFAULT: "#386A8A", soft: "#DCE7EC" },
        success: { DEFAULT: "#2E6B3E", soft: "#DCEADD" },
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: { card: "12px", control: "7px", pill: "20px" },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

Load fonts with `next/font/google` in `app/layout.tsx` (Fraunces, Inter, JetBrains_Mono) and
expose them as the CSS variables referenced above — don't use a `<link>` import.

### 1.5 Component inventory to rebuild as shared components

Reuse the same visual language from v1 as real, typed components in `src/components/ui/`:
`Button` (primary/ghost/amber/danger, sm size), `Badge` (status-driven), `Input`, `Select`,
`Textarea`, `Modal`, `Drawer`, `Toast` (use a lib like `sonner`, restyled to match), `Table`,
`StatCard`, `Panel`, `Tabs`, `Chip`, `Calendar` cell grid, `Avatar` (initials + deterministic
color).

---

## 2. Tech stack

- **Framework:** Next.js 15 (App Router, Server Components + Server Actions), TypeScript strict.
- **Styling:** Tailwind CSS + the tokens above. `shadcn/ui` primitives are fine to install as a
  base, but every restyled to the tokens above — never left in default shadcn slate/zinc.
- **Database:** PostgreSQL. **ORM:** Prisma.
- **Auth:** Auth.js (NextAuth v5) with the Credentials provider (email + password, hashed with
  `bcrypt`) plus optional Google OAuth. JWT session strategy, session includes `userId`,
  `role`, `clinicId`, `username`.
- **Billing:** Stripe (Checkout Sessions + Customer Portal + Webhooks). Plans and prices are
  mirrored between the local `Plan` table and Stripe Products/Prices.
- **Charts:** `recharts` (already used in v1).
- **Forms:** `react-hook-form` + `zod` for validation, shared schemas between client and
  server actions.
- **Email:** Resend (or Postmark) for onboarding, invite, and billing emails.
- **Hosting target:** Vercel (app) + a managed Postgres (Neon/Supabase/RDS).

---

## 3. Tenancy & roles model

Chartwell is **multi-tenant**: every clinic is a tenant, every person is a `User`, and a
`Membership` joins a `User` to a `Clinic` with a `Role`.

```
User ──< Membership >── Clinic
```

- A `User` can, in theory, belong to more than one clinic (e.g. a doctor who consults at two
  practices) but the MVP can assume one active clinic per user, stored as `user.activeClinicId`.
- **Roles** (`Membership.role`):
  - `OWNER` — created the clinic, full access, billing owner.
  - `ADMIN` — everything except billing/plan changes and deleting the clinic.
  - `DOCTOR` — sees own appointments/patients/records, limited settings access.
  - `FRONT_DESK` — patients, appointments, billing; no medical records edit, no settings.
- **Platform-level role**, separate from clinic roles, lives on `User.platformRole`:
  - `USER` (default) or `SUPER_ADMIN` (Chartwell staff — access to `/admin`).

### 3.1 Username / account ID

Every `User` gets a unique, permanent **username** (handle) at signup:
- Auto-generated from their name (`ananya-rao`), de-duplicated with a numeric suffix if taken
  (`ananya-rao-2`).
- Shown in Settings → Account, editable once (or freely — your call), always lowercase,
  `[a-z0-9-]{3,30}`.
- Used as the human-readable ID in the admin panel's user list and in support/reference
  contexts (e.g. "user `ananya-rao`, clinic `riverside-clinic`"). It is **not** required to be
  part of the URL — dashboard routes are tenant-scoped by session, not by URL slug, to keep
  routing simple (`/dashboard/patients`, not `/c/riverside/patients`). If you later want
  shareable per-clinic URLs, the `Clinic.slug` field (see schema) is already there for it.

---

## 4. Data model (Prisma schema)

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum PlatformRole {
  USER
  SUPER_ADMIN
}

enum ClinicRole {
  OWNER
  ADMIN
  DOCTOR
  FRONT_DESK
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  INCOMPLETE
}

enum AppointmentStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum InvoiceStatus {
  PAID
  UNPAID
}

enum ClinicStatus {
  ACTIVE
  SUSPENDED
}

model User {
  id            String       @id @default(cuid())
  username      String       @unique
  name          String
  email         String       @unique
  passwordHash  String?
  image         String?
  platformRole  PlatformRole @default(USER)
  activeClinicId String?
  onboardingStep String      @default("CLINIC_DETAILS") // see Section 5
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  memberships   Membership[]
}

model Clinic {
  id            String       @id @default(cuid())
  name          String
  slug          String       @unique
  type          String       // "General practice" | "Dental" | "Pediatrics" | ...
  phone         String?
  address       String?
  openTime      String?      @default("09:00")
  closeTime     String?      @default("18:00")
  status        ClinicStatus @default(ACTIVE)
  createdAt     DateTime     @default(now())

  memberships   Membership[]
  patients      Patient[]
  doctors       Doctor[]
  appointments  Appointment[]
  invoices      Invoice[]
  records       MedicalRecord[]
  subscription  Subscription?
}

model Membership {
  id        String     @id @default(cuid())
  userId    String
  clinicId  String
  role      ClinicRole
  createdAt DateTime   @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  clinic Clinic @relation(fields: [clinicId], references: [id], onDelete: Cascade)

  @@unique([userId, clinicId])
}

model Plan {
  id              String   @id @default(cuid())
  name            String   // "Starter" | "Practice" | "Clinic Group"
  slug            String   @unique
  description     String?
  priceMonthly    Int      // in smallest currency unit (paise/cents)
  priceYearly     Int?
  currency        String   @default("INR")
  patientLimit    Int?     // null = unlimited
  doctorLimit     Int?     // null = unlimited
  features        String[] // list of feature strings shown on pricing card
  isFeatured      Boolean  @default(false)
  isActive        Boolean  @default(true)
  sortOrder       Int      @default(0)
  stripeProductId String?
  stripePriceIdMonthly String?
  stripePriceIdYearly  String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  subscriptions   Subscription[]
}

model Subscription {
  id                   String             @id @default(cuid())
  clinicId             String             @unique
  planId               String
  status               SubscriptionStatus @default(TRIALING)
  billingCycle         String             @default("monthly") // "monthly" | "yearly"
  trialEndsAt          DateTime?
  currentPeriodEnd     DateTime?
  stripeCustomerId     String?
  stripeSubscriptionId String?
  cancelAtPeriodEnd    Boolean            @default(false)
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt

  clinic Clinic @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  plan   Plan   @relation(fields: [planId], references: [id])
}

model Patient {
  id          String   @id @default(cuid())
  clinicId    String
  displayId   String   // human-facing "P-1042" style, unique per clinic
  name        String
  age         Int
  gender      String
  phone       String
  email       String?
  address     String?
  bloodGroup  String?
  allergies   String?
  condition   String?
  colorTag    String   @default("#1E4638")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  clinic       Clinic          @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  appointments Appointment[]
  invoices     Invoice[]
  records      MedicalRecord[]

  @@unique([clinicId, displayId])
}

model Doctor {
  id         String   @id @default(cuid())
  clinicId   String
  userId     String?  // linked if the doctor also has a login (Membership)
  name       String
  specialty  String
  phone      String
  email      String
  workingDays String[] // ["Mon","Wed","Fri"]
  createdAt  DateTime @default(now())

  clinic       Clinic        @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  appointments Appointment[]
  records      MedicalRecord[]
}

model Appointment {
  id        String             @id @default(cuid())
  clinicId  String
  patientId String
  doctorId  String
  date      DateTime           @db.Date
  time      String             // "09:00"
  duration  Int                @default(30)
  reason    String
  status    AppointmentStatus  @default(SCHEDULED)
  createdAt DateTime           @default(now())

  clinic  Clinic  @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  patient Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
  doctor  Doctor  @relation(fields: [doctorId], references: [id], onDelete: Cascade)
}

model Invoice {
  id        String        @id @default(cuid())
  clinicId  String
  patientId String
  displayId String        // "INV-2201"
  date      DateTime      @db.Date
  status    InvoiceStatus @default(UNPAID)
  items     Json          // [{ desc: string, amount: number }]
  createdAt DateTime      @default(now())

  clinic  Clinic  @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  patient Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)

  @@unique([clinicId, displayId])
}

model MedicalRecord {
  id           String   @id @default(cuid())
  clinicId     String
  patientId    String
  doctorId     String
  date         DateTime @db.Date
  diagnosis    String
  prescription String?
  notes        String?
  createdAt    DateTime @default(now())

  clinic  Clinic  @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  patient Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
  doctor  Doctor  @relation(fields: [doctorId], references: [id], onDelete: Cascade)
}
```

Notes:
- Money is stored in the smallest currency unit (paise) to avoid float issues — format with a
  `formatCurrency()` helper at the edge.
- `Patient.displayId` / `Invoice.displayId` recreate the friendly `P-1042` / `INV-2201` look
  from v1 but scoped per clinic, generated server-side on create (`clinicPatientCount + 1`).
- Every clinic-scoped table carries `clinicId` — **every** query in the app must filter by the
  session's `clinicId`. This is the core multi-tenancy rule; put it in one `getClinicScopedDb()`
  helper so it can't be forgotten.

---

## 5. Auth & onboarding flow

### 5.1 Registration steps (`/register`)

Single form, multi-step wizard, state kept in the URL (`?step=`) so it's resumable:

1. **Account** — name, email, password → creates `User` (platformRole `USER`), generates
   `username`, sends verification email (optional but recommended), starts session.
2. **Clinic details** — clinic name, clinic type (dropdown: General practice / Dental /
   Pediatrics / Physiotherapy / Multi-specialty / Other), phone, address → creates `Clinic`
   (`slug` from name), creates `Membership` (`role: OWNER`), sets `user.activeClinicId`.
3. **Team (optional, skippable)** — invite up to N staff by email with a role each. Creates
   pending invites (a lightweight `Invite` model or a magic-link email; can be a v2.1 feature —
   stub the UI, make "Skip for now" the default path so it never blocks signup).
4. **Choose a plan** — pulls live `Plan` rows (`isActive: true`, ordered by `sortOrder`).
   Selecting the free "Starter" plan skips straight to checkout-free activation
   (`Subscription.status = ACTIVE`, no Stripe). Selecting a paid plan redirects to Stripe
   Checkout (Section 9); on success webhook, `Subscription` is created/activated and the user
   is redirected back to `/onboarding/done`.
5. **Done** → redirect to `/dashboard` with a first-run checklist banner ("Add your first
   patient", "Invite a doctor", "Set your working hours") that dismisses per item.

Persist progress via `user.onboardingStep` so a refresh or an early exit resumes at the right
step instead of restarting.

### 5.2 Login (`/login`)

Standard email + password via Auth.js Credentials provider. On success, redirect to
`/dashboard` if `activeClinicId` and an active/trialing subscription exist; otherwise redirect
back into onboarding at the saved step.

### 5.3 Route protection (middleware)

`middleware.ts` checks the session on every request:
- `/dashboard/**` → requires a session **and** a clinic with an active/trialing subscription;
  otherwise redirect to `/onboarding` or `/billing/expired`.
- `/admin/**` → requires `platformRole === "SUPER_ADMIN"`; otherwise 404 (don't reveal it
  exists).
- `/login`, `/register` → redirect away if already authenticated.

---

## 6. Folder structure (Next.js App Router)

```
chartwell/
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts                    # seeds demo clinic + default Plans
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/
│  │  │  ├─ page.tsx              # landing page
│  │  │  ├─ pricing/page.tsx      # reads live Plan rows
│  │  │  └─ layout.tsx
│  │  ├─ (auth)/
│  │  │  ├─ login/page.tsx
│  │  │  ├─ register/page.tsx
│  │  │  └─ layout.tsx            # the split-screen AuthShell
│  │  ├─ onboarding/
│  │  │  ├─ clinic/page.tsx
│  │  │  ├─ team/page.tsx
│  │  │  ├─ plan/page.tsx
│  │  │  └─ done/page.tsx
│  │  ├─ (dashboard)/
│  │  │  ├─ layout.tsx            # sidebar + topbar shell, loads session + clinic
│  │  │  ├─ dashboard/page.tsx    # overview
│  │  │  ├─ patients/
│  │  │  │  ├─ page.tsx
│  │  │  │  └─ [patientId]/page.tsx
│  │  │  ├─ appointments/page.tsx
│  │  │  ├─ doctors/page.tsx
│  │  │  ├─ billing/page.tsx      # clinic's own patient invoices
│  │  │  ├─ records/page.tsx
│  │  │  └─ settings/
│  │  │     ├─ clinic/page.tsx
│  │  │     ├─ account/page.tsx
│  │  │     ├─ notifications/page.tsx
│  │  │     └─ plan/page.tsx      # current plan + "Manage billing" → Stripe portal
│  │  ├─ admin/                    # SUPER_ADMIN only
│  │  │  ├─ layout.tsx
│  │  │  ├─ page.tsx               # platform overview: MRR, active clinics, churn
│  │  │  ├─ clinics/
│  │  │  │  ├─ page.tsx            # all clinics, status, plan, actions
│  │  │  │  └─ [clinicId]/page.tsx # detail + suspend/reactivate/change plan
│  │  │  ├─ users/
│  │  │  │  ├─ page.tsx            # all users across platform
│  │  │  │  └─ [userId]/page.tsx
│  │  │  ├─ plans/
│  │  │  │  ├─ page.tsx            # list of Plan rows
│  │  │  │  ├─ new/page.tsx
│  │  │  │  └─ [planId]/page.tsx   # edit plan (price, features, active/inactive)
│  │  │  └─ payments/page.tsx      # payment/invoice history across all clinics
│  │  ├─ api/
│  │  │  ├─ auth/[...nextauth]/route.ts
│  │  │  ├─ stripe/
│  │  │  │  ├─ checkout/route.ts   # POST → creates Checkout Session
│  │  │  │  ├─ portal/route.ts     # POST → creates Billing Portal session
│  │  │  │  └─ webhook/route.ts    # POST → handles Stripe events
│  │  │  └─ uploads/route.ts       # (optional) patient document uploads
│  │  ├─ layout.tsx                 # root layout, font loading
│  │  └─ globals.css
│  ├─ components/
│  │  ├─ ui/                       # Button, Badge, Modal, Drawer, Table, StatCard, etc.
│  │  ├─ marketing/                # Hero, FeatureGrid, PricingCards, Faq, Footer
│  │  ├─ dashboard/                # Sidebar, Topbar, OverviewCharts
│  │  ├─ patients/                 # PatientTable, PatientModal, PatientDrawer
│  │  ├─ appointments/             # CalendarGrid, AppointmentModal, AppointmentList
│  │  ├─ doctors/, billing/, records/, settings/
│  │  └─ admin/                    # ClinicsTable, PlanForm, UsersTable, MetricCards
│  ├─ lib/
│  │  ├─ db.ts                     # Prisma client singleton
│  │  ├─ auth.ts                   # Auth.js config
│  │  ├─ session.ts                # getSession(), requireClinic(), requireSuperAdmin()
│  │  ├─ stripe.ts                 # Stripe client + helpers
│  │  ├─ tenancy.ts                # getClinicScopedDb(clinicId) helper
│  │  ├─ ids.ts                    # generateUsername(), generateDisplayId()
│  │  └─ validation/                # zod schemas, shared client+server
│  ├─ server/
│  │  └─ actions/                  # Server Actions grouped by domain (see Section 10)
│  │     ├─ patients.ts
│  │     ├─ appointments.ts
│  │     ├─ doctors.ts
│  │     ├─ billing.ts
│  │     ├─ records.ts
│  │     ├─ clinic.ts
│  │     ├─ plans.ts               # admin-only
│  │     └─ admin.ts               # admin-only
│  └─ types/
├─ public/
├─ tailwind.config.ts
├─ next.config.ts
└─ .env.example
```

---

## 7. Route map summary

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Landing page |
| `/pricing` | Public | Live pricing from `Plan` table |
| `/login`, `/register` | Public (redirect if authed) | Auth |
| `/onboarding/*` | Authed, incomplete onboarding | Multi-step wizard |
| `/dashboard/*` | Authed + active clinic | The product (Section 6 list) |
| `/admin/*` | `platformRole=SUPER_ADMIN` | Platform control panel |
| `/api/stripe/*` | Server-to-server / redirect targets | Checkout, portal, webhooks |

---

## 8. Admin panel spec (`/admin`)

Distinct visual shell from the clinic dashboard (same design tokens, but sidebar label reads
"Chartwell Admin" and uses the coral accent sparingly to signal "this is the control room, not
a clinic view" — e.g. a thin coral top bar).

**Pages & actions:**

- **Overview** — total clinics, active vs. trialing vs. canceled, MRR (sum of active
  subscriptions' plan price), signups this week, a simple trend chart (reuse the `AreaChart`
  pattern from the dashboard overview).
- **Clinics** — table of every `Clinic`: name, type, owner, plan, subscription status, patient
  count, created date. Row actions: **View**, **Suspend** (`status = SUSPENDED`, blocks their
  dashboard login with a clear "Your clinic account is suspended, contact support" screen),
  **Reactivate**, **Change plan** (manually override, for support/comp scenarios).
- **Clinic detail** — full profile, all members with roles, subscription history, ability to
  remove a member or transfer ownership.
- **Users** — every `User` across the platform with their username, email, clinic(s), platform
  role. Action: promote/demote `SUPER_ADMIN` (guard this — require a confirmation and maybe a
  hardcoded "you can't demote yourself" check).
- **Plans** — full CRUD on the `Plan` table: name, price (monthly/yearly), currency, patient/
  doctor limits, feature bullet list (repeatable text inputs), featured toggle, active toggle,
  sort order. Saving a price change here should also push an update to the corresponding Stripe
  Price (Stripe prices are immutable — create a new Price and update `stripePriceIdMonthly` /
  `stripePriceIdYearly` rather than mutating). This is exactly what makes pricing "dynamic":
  the public `/pricing` page and onboarding step 4 always read from this table, never from
  hardcoded JSX.
- **Payments** — a flat list of successful/failed Stripe payments across all clinics (pull from
  Stripe or mirror via webhook into a lightweight `Payment` log table), for reconciliation.

All admin server actions must call `requireSuperAdmin()` at the top before touching data —
never rely on the UI being hidden as the only protection.

---

## 9. Dynamic pricing & checkout flow

1. **Source of truth:** the `Plan` table. Seed it (`prisma/seed.ts`) with the same three tiers
   as v1 (Starter/free, Practice, Clinic Group) so the app is never in a state with zero plans.
2. **Public pricing page** (`/pricing`) and **onboarding step 4** both server-fetch
   `db.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })` and render
   the existing pricing-card component — no plan data is ever hardcoded in a component.
3. **Choosing a paid plan** → `POST /api/stripe/checkout` with `{ planId, billingCycle }`:
   - Looks up the `Plan`, resolves the right `stripePriceId`.
   - Creates or reuses a Stripe Customer for the clinic (`Subscription.stripeCustomerId`).
   - Creates a Stripe Checkout Session (`mode: "subscription"`), `success_url` →
     `/onboarding/done` (or `/dashboard/settings/plan?success=1` if upgrading later),
     `cancel_url` back to the plan picker.
   - Redirects the browser to `session.url`.
4. **Webhook** (`/api/stripe/webhook`) handles: `checkout.session.completed` (create/activate
   `Subscription`), `invoice.paid` (extend `currentPeriodEnd`, log a `Payment`),
   `invoice.payment_failed` (set `PAST_DUE`, trigger an email), `customer.subscription.deleted`
   (set `CANCELED`).
5. **Managing an existing subscription** (`/dashboard/settings/plan`) — "Manage billing" button
   calls `POST /api/stripe/portal` to open the Stripe Customer Portal (upgrade/downgrade,
   update card, cancel). Don't rebuild payment-method UI by hand.
6. **Free plan:** never touches Stripe. Selecting "Starter" directly creates a `Subscription`
   row with `status: ACTIVE`, `planId` = starter plan, no Stripe IDs.
7. **Enforcing limits:** before creating a patient, check
   `plan.patientLimit === null || currentPatientCount < plan.patientLimit`; if exceeded, block
   with an upgrade prompt (use the amber accent, not coral — this is a nudge, not an error).

---

## 10. Server actions / API surface (by domain)

Use Next.js Server Actions for all in-app mutations (no need for a separate REST API except
Stripe's three routes, which must be Route Handlers because Stripe posts to them directly).

- `server/actions/clinic.ts` — `updateClinicProfile`, `updateWorkingHours`.
- `server/actions/patients.ts` — `createPatient`, `updatePatient`, `deletePatient`,
  `listPatients(search, filters)`.
- `server/actions/appointments.ts` — `createAppointment`, `updateAppointment`,
  `setAppointmentStatus`, `listAppointmentsForRange`.
- `server/actions/doctors.ts` — `createDoctor`, `updateDoctor`, `deleteDoctor`.
- `server/actions/billing.ts` — `createInvoice`, `markInvoicePaid`, `listInvoices`.
- `server/actions/records.ts` — `createRecord`, `listRecordsForPatient`.
- `server/actions/plans.ts` (admin) — `createPlan`, `updatePlan`, `archivePlan`.
- `server/actions/admin.ts` (admin) — `suspendClinic`, `reactivateClinic`, `changeClinicPlan`,
  `promoteToSuperAdmin`, `platformMetrics()`.

Every non-admin action starts with `const { clinicId } = await requireClinic()` and every
query/mutation is scoped with `where: { clinicId }`. Every admin action starts with
`await requireSuperAdmin()`.

---

## 11. Environment variables (`.env.example`)

```
DATABASE_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```

---

## 12. Build order for the agent

Work in this order so every step is testable before the next depends on it:

1. Scaffold Next.js + Tailwind + fonts, port the design tokens (Section 1) into
   `tailwind.config.ts` and `globals.css`. Rebuild the shared `ui/` components.
2. Prisma schema (Section 4) + migrate + seed script (default Plans + one demo clinic with the
   same sample data as v1, for local dev).
3. Auth.js setup, `/login`, `/register` (account step only for now), session + middleware.
4. Rebuild the marketing landing page and `/pricing` (live from DB) using the ported components.
5. Onboarding wizard (Section 5.1) steps 2–5, wired to real `Clinic`/`Membership` creation.
6. Dashboard shell (sidebar/topbar) + Overview page with real queries.
7. Patients, Appointments, Doctors, Billing, Records pages — port the v1 UI, replace in-memory
   state with server actions + Prisma.
8. Settings pages (clinic/account/notifications/plan).
9. Stripe integration end-to-end (checkout, webhook, portal), enforce plan limits.
10. Admin panel (Section 8) in full.
11. Polish pass: empty states, loading skeletons, error boundaries, mobile responsiveness
    (already specified in the v1 CSS breakpoints — carry them over).

---

## 13. Reference

The v1 prototype (`ClinicCRM.jsx`) is the canonical UI reference for every screen listed above
— its JSX structure, copy, and interaction patterns (modals, drawers, calendar, tabs) should be
ported near-verbatim into the componentized Next.js version, just backed by real data instead
of `useState` seed arrays.
