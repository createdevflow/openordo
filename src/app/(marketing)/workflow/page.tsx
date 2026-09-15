export const metadata = {
  title: "How it works",
  description: "See the seamless daily workflow of a clinic using OpenORDO.",
}

export default function WorkflowPage() {
  return (
    <div className="py-20 px-7 max-w-[1180px] mx-auto">
      <div className="mb-[60px] max-w-[640px]">
        <h1 className="mb-3.5 font-serif text-[42px] font-semibold tracking-[-0.01em] text-ink">
          From walk-in to paid invoice
        </h1>
        <p className="text-[18px] leading-[1.55] text-ink-soft">
          The same four steps repeat all day at the front desk — OpenORDO is built around that exact loop. See how our intuitive design speeds up your daily operations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
        {[
          { n: "01", t: "Register the patient", d: "Add a new patient in seconds directly from the calendar or roster: name, contact, age, and conditions." },
          { n: "02", t: "Schedule the visit", d: "Pick a doctor, date and duration. Real-time availability prevents scheduling conflicts." },
          { n: "03", t: "Record the visit", d: "Doctor updates appointment status and adds clinical visit notes directly against the patient's record." },
          { n: "04", t: "Collect & invoice", d: "Itemize visit charges, mark paid or unpaid, and keep daily revenue accounts balanced automatically." },
        ].map(s => (
          <div key={s.n} className="border-t-2 border-forest pt-6">
            <div className="mb-3 font-mono text-[14px] font-semibold text-amber bg-amber-soft w-10 h-10 flex items-center justify-center rounded-full">{s.n}</div>
            <h4 className="mb-3 text-[18px] font-bold text-ink">{s.t}</h4>
            <p className="m-0 text-[15px] leading-[1.6] text-ink-soft">{s.d}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
