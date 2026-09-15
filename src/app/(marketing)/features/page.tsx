import { Users, Calendar, Stethoscope, Receipt, FileText, Activity, CalendarDays, BellRing, Download } from "lucide-react"

export const metadata = {
  title: "Features",
  description: "Explore the comprehensive features of OpenORDO.",
}

export default function FeaturesPage() {
  return (
    <div className="py-20 px-7 max-w-[1180px] mx-auto">
      <div className="mb-[46px] max-w-[640px]">
        <h1 className="mb-3.5 font-serif text-[42px] font-semibold tracking-[-0.01em] text-ink">
          Everything a clinic actually needs
        </h1>
        <p className="text-[18px] leading-[1.55] text-ink-soft">
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
          <div key={i} className="bg-paper-raised px-[26px] py-[30px] hover:bg-paper transition-colors">
            <div className="mb-[18px] flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-forest text-amber-soft">
              <f.icon size={17} />
            </div>
            <h3 className="mb-2 text-[16.5px] font-bold text-ink">{f.title}</h3>
            <p className="m-0 text-[14px] leading-[1.5] text-ink-soft">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
