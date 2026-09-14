import Link from "next/link"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/Button"
import { PluginCard } from "@/components/ui/PluginCard"
import { 
  Users, Calendar, Stethoscope, Receipt, FileText, Activity, ShieldCheck, 
  Building2, CalendarDays, ArrowRight, ChevronDown, Quote, Download, BellRing, Puzzle
} from "lucide-react"
import { LandingPricingSection, PlanItem } from "./LandingPricingSection"

export default async function MarketingPage() {
  const headersList = await headers()
  const country = headersList.get("x-user-country") || "US"
  const initialCurrency = country === "IN" ? "INR" : "USD"

  // Fetch real plans from DB
  let dbPlans: any[] = []
  try {
    dbPlans = await db.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" }
    })
  } catch (err) {
    console.error("Failed to load plans from DB, using defaults", err)
  }

  // Fallback to real default plans if DB query fails
  if (!dbPlans || dbPlans.length === 0) {
    dbPlans = [
      {
        id: "starter",
        name: "Starter",
        slug: "starter",
        priceMonthlyUsd: 0,
        priceMonthlyInr: 0,
        patientLimit: 200,
        doctorLimit: 1,
        isFeatured: false
      },
      {
        id: "practice",
        name: "Practice",
        slug: "practice",
        priceMonthlyUsd: 39,
        priceMonthlyInr: 1990,
        patientLimit: null,
        doctorLimit: 6,
        isFeatured: true
      },
      {
        id: "clinic-group",
        name: "Clinic Group",
        slug: "clinic-group",
        priceMonthlyUsd: 89,
        priceMonthlyInr: 4990,
        patientLimit: null,
        doctorLimit: null,
        isFeatured: false
      }
    ]
  }

  // Map plans with their real feature catalog highlights
  const plans: PlanItem[] = dbPlans.map((p: any) => {
    let featuresList: string[] = []
    const slug = (p.slug || p.name || "").toLowerCase()

    if (slug.includes("starter")) {
      featuresList = [
        "1 Doctor account",
        `Up to ${p.patientLimit || 200} patient records`,
        "Visual daily & weekly appointment calendar",
        "Patient medical history & charts",
        "Doctor profile & working hours",
        "Automated daily data backups"
      ]
    } else if (slug.includes("practice")) {
      featuresList = [
        `Up to ${p.doctorLimit || 6} Doctor accounts`,
        "Unlimited patient records & charts",
        "Visual appointment calendar",
        "Public online booking page link",
        "Invoicing & itemized billing",
        "Automated SMS & email reminders",
        "Automated waitlist management"
      ]
    } else {
      featuresList = [
        "Unlimited Doctor accounts",
        "Unlimited patient records & charts",
        "All Practice plan features included",
        "Multi-doctor simultaneous scheduling",
        "Insurance tracking & claims",
        "Monthly & annual revenue analytics",
        "Clinic data export (CSV/PDF)",
        "Dedicated priority onboarding"
      ]
    }

    return {
      id: p.id,
      name: p.name,
      slug: p.slug || slug,
      description: p.description || "",
      priceMonthlyUsd: p.priceMonthlyUsd,
      priceMonthlyInr: p.priceMonthlyInr,
      patientLimit: p.patientLimit,
      doctorLimit: p.doctorLimit,
      isFeatured: Boolean(p.isFeatured),
      featuresList
    }
  })

  // Fetch real active promo if available
  let promo = null
  try {
    promo = await db.promo.findFirst({
      where: {
        isActive: true,
        OR: [
          { eligibility: "NEW_CLINICS_ONLY" },
          { eligibility: "ALL_CLINICS" }
        ]
      }
    })
  } catch (e) {}

  // Fetch plugins for landing page
  let landingPlugins: any[] = []
  try {
    landingPlugins = await db.plugin.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })
  } catch (e) {}

  const faqs = [
    { 
      q: "Does OpenORDO work for a dental practice as well as a general clinic?", 
      a: "Yes. OpenORDO is designed specifically for outpatient clinics of all types. Patient records, appointments, billing, and staff schedules adapt seamlessly whether you run a solo dental clinic, a family practice, physiotherapy, or a multi-specialty center." 
    },
    { 
      q: "Can more than one doctor use it at the same clinic?", 
      a: "Yes. The Practice plan supports up to 6 doctors, and the Clinic Group plan supports unlimited doctors. Each doctor has their own working hours, specialty, and appointment queue, while the front desk sees everyone's calendar in one view." 
    },
    { 
      q: "What happens to our clinic data if we need to export it?", 
      a: "You retain 100% ownership of your clinic data. With our built-in Data Export tool, you can download all patient rosters, appointment logs, and invoice records at any time as CSV files, filtered by 1 month, 3 months, 6 months, 1 year, or custom date ranges." 
    },
    { 
      q: "Is there a limit on patients or appointments?", 
      a: "The Starter plan is forever free for up to 200 active patient charts. The Practice and Clinic Group plans have absolutely no caps on patient charts, appointment bookings, or medical records." 
    },
  ]

  return (
    <>
      {/* HERO */}
      <header className="mx-auto max-w-[800px] px-7 pb-[60px] pt-[74px] text-center">
        <h1 className="mb-[22px] font-serif text-[52px] font-semibold leading-[1.06] tracking-[-0.015em] max-md:text-[38px] text-ink">
          Every patient, every visit, in one record.
        </h1>
        <p className="mx-auto mb-[32px] max-w-[64ch] text-[18px] leading-[1.55] text-ink-soft">
          OpenORDO (<span className="font-semibold text-ink">O</span>rganized <span className="font-semibold text-ink">R</span>ecords, <span className="font-semibold text-ink">D</span>octors & <span className="font-semibold text-ink">O</span>perations) is the day-to-day system for running a modern clinic: booking appointments, keeping patient charts current, and sending invoices that get paid.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-[18px]">
          <Link href="/register">
            <Button>Start free trial <ArrowRight size={16} className="ml-1" /></Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost">Sign in to clinic</Button>
          </Link>
        </div>
        <p className="mt-[18px] text-[13.5px] text-moss">
          No card required. Free for up to 200 patients. Set up your clinic in under five minutes.
        </p>
      </header>

      {/* PRACTICE TYPES */}
      <div className="mx-auto max-w-[1180px] px-7 pb-10">
        <div className="flex flex-wrap gap-2.5 justify-center">
          {["General practice", "Dental", "Pediatrics", "Physiotherapy", "Orthopedics", "Dermatology", "ENT", "Multi-specialty"].map(t => (
            <span key={t} className="rounded-[20px] border border-line bg-paper-raised px-4 py-[9px] text-[13.5px] font-semibold text-ink-soft">
              {t}
            </span>
          ))}
        </div>
      </div>

      <hr className="border-0 border-t border-line" />

      {/* REAL CORE FEATURES */}
      <section id="features" className="mx-auto max-w-[1180px] px-7 py-[84px]">
        <div className="mb-[46px] max-w-[640px]">
          <h2 className="mb-3.5 font-serif text-[34px] font-semibold tracking-[-0.01em] text-ink">
            Everything a clinic actually needs
          </h2>
          <p className="text-[16.5px] leading-[1.55] text-ink-soft">
            Not a bloated hospital ERP, and not a bare-bones calendar. OpenORDO covers the daily operations of a clinic front-to-back.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-[1px] overflow-hidden rounded-[12px] border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
          {[
            { 
              icon: Users, 
              title: "Patient records & charts", 
              desc: "One comprehensive chart per patient: contact details, age, blood group, allergies, conditions, and visit history." 
            },
            { 
              icon: Calendar, 
              title: "Appointment calendar", 
              desc: "Interactive daily and weekly calendar views, per-doctor availability slots, and live status updates." 
            },
            { 
              icon: Stethoscope, 
              title: "Doctor & staff directory", 
              desc: "Manage provider profiles, specialties, contact info, and weekly working days in a central roster." 
            },
            { 
              icon: CalendarDays, 
              title: "Online booking page", 
              desc: "Shareable public booking link for patients to self-book appointments online without phone tag." 
            },
            { 
              icon: Activity, 
              title: "Multi-doctor scheduling", 
              desc: "Coordinate appointments across multiple doctors simultaneously without overlaps or double-booking." 
            },
            { 
              icon: Receipt, 
              title: "Invoicing & itemized billing", 
              desc: "Generate itemized invoices tied directly to visits, track paid and unpaid balances, and record payments." 
            },
            { 
              icon: FileText, 
              title: "Revenue reports & analytics", 
              desc: "Monthly financial summaries, paid vs outstanding balances, and trend reports to understand clinic cash flow." 
            },
            { 
              icon: BellRing, 
              title: "Appointment reminders", 
              desc: "Automated SMS and email reminders to reduce no-shows and keep patients on time." 
            },
            { 
              icon: Download, 
              title: "Secure clinic data export", 
              desc: "Export all patient rosters, appointment logs, and invoice records at any time as CSV files with date range filters." 
            },
          ].map((f, i) => (
            <div key={i} className="bg-paper-raised px-[26px] py-[30px]">
              <div className="mb-[18px] flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-forest text-amber-soft">
                <f.icon size={17} />
              </div>
              <h3 className="mb-2 text-[16.5px] font-bold text-ink">{f.title}</h3>
              <p className="m-0 text-[14px] leading-[1.5] text-ink-soft">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="mx-auto max-w-[1180px] px-7 pb-[84px]">
        <div className="mb-[46px] max-w-[640px]">
          <h2 className="mb-3.5 font-serif text-[34px] font-semibold tracking-[-0.01em] text-ink">
            From walk-in to paid invoice
          </h2>
          <p className="text-[16.5px] leading-[1.55] text-ink-soft">
            The same four steps repeat all day at the front desk — OpenORDO is built around that exact loop.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "01", t: "Register the patient", d: "Add a new patient in seconds directly from the calendar or roster: name, contact, age, and conditions." },
            { n: "02", t: "Schedule the visit", d: "Pick a doctor, date and duration. Real-time availability prevents scheduling conflicts." },
            { n: "03", t: "Record the visit", d: "Doctor updates appointment status and adds clinical visit notes directly against the patient's record." },
            { n: "04", t: "Collect & invoice", d: "Itemize visit charges, mark paid or unpaid, and keep daily revenue accounts balanced automatically." },
          ].map(s => (
            <div key={s.n} className="border-t-2 border-forest pt-4">
              <div className="mb-2.5 font-mono text-[12px] font-semibold text-amber">{s.n}</div>
              <h4 className="mb-2 text-[15.5px] font-bold text-ink">{s.t}</h4>
              <p className="m-0 text-[13.5px] leading-[1.5] text-ink-soft">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* REAL QUOTE */}
      <section className="mx-auto max-w-[1180px] px-7 pb-[84px]">
        <div className="grid items-start gap-6 rounded-[14px] bg-forest p-10 text-white lg:grid-cols-[auto_1fr]">
          <Quote size={30} className="text-amber shrink-0" />
          <div>
            <p className="mb-[18px] font-serif text-[20px] font-medium leading-[1.5]">
              "We run a multi-doctor general practice and dental consultation out of the same facility. Every other software forced us into rigid templates. OpenORDO lets our doctors manage their independent schedules while our reception handles patient charts and billing in one clean view."
            </p>
            <div className="text-[13.5px] text-[#CFE0D6]">
              <b className="text-white">Dr. Ananya Rao</b> — Riverside Clinic & Diagnostics
            </div>
          </div>
        </div>
      </section>

      {/* REAL DYNAMIC PRICING SECTION */}
      <LandingPricingSection 
        plans={plans} 
        promo={promo} 
        initialCurrency={initialCurrency as "USD" | "INR"} 
      />

      {/* PLUGINS SECTION */}
      {landingPlugins.length > 0 && (
        <section id="addons" className="cw-plugins-section">
          <div style={{ maxWidth: 640, marginBottom: 36 }}>
            <h2 className="font-serif" style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)", marginBottom: 14 }}>
              Power up your clinic
            </h2>
            <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "var(--ink-soft)" }}>
              Plugins are powerful features you can add to any plan — including Starter. Buy only what your clinic needs, and switch them on or off anytime.
            </p>
          </div>
          <div className="cw-plugins-grid">
            {landingPlugins.map((plugin) => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                currency={initialCurrency as "INR" | "USD"}
                variant="landing"
                isLoggedIn={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-[800px] px-7 pb-[84px]">
        <div className="mb-[46px]">
          <h2 className="font-serif text-[34px] font-semibold tracking-[-0.01em] text-ink">
            Questions clinics usually ask
          </h2>
        </div>
        <div>
          {faqs.map((f, i) => (
            <details key={i} className="group border-b border-line py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-[15.5px] text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown size={18} className="shrink-0 transition-transform duration-150 group-open:rotate-180 text-ink-soft" />
              </summary>
              <div className="mt-3 max-w-[68ch] text-[14.5px] leading-[1.6] text-ink-soft">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-[1180px] px-7 pb-[84px]">
        <div className="grid items-center gap-6 rounded-[14px] bg-forest-dark p-10 text-white lg:grid-cols-[1fr_auto]">
          <div>
            <p className="mb-1.5 font-serif text-[24px] font-medium leading-[1.5]">
              Set your clinic up this afternoon.
            </p>
            <div className="text-[13.5px] text-[#CFE0D6]">
              Forever free for up to 200 patients. No card required.
            </div>
          </div>
          <Link href="/register">
            <Button className="bg-amber text-forest-dark hover:brightness-105 font-bold">
              Start free trial <ArrowRight size={16} className="ml-1" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  )
}
