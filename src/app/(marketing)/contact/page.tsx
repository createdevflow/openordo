import { ContactForm } from "./ContactForm"

export const metadata = {
  title: "Contact Us",
  description: "Get in touch with the OpenORDO team.",
}

export default function ContactPage() {
  return (
    <div className="py-20 px-7 max-w-[800px] mx-auto">
      <div className="mb-[46px] text-center">
        <h1 className="mb-3.5 font-serif text-[42px] font-semibold tracking-[-0.01em] text-ink">
          Get in touch
        </h1>
        <p className="text-[18px] leading-[1.55] text-ink-soft max-w-[500px] mx-auto">
          Have a question about pricing, features, or need help migrating your clinic's data? We're here to help.
        </p>
      </div>

      <div className="bg-paper-raised p-8 md:p-10 rounded-card border border-line shadow-sm">
        <ContactForm />
      </div>
    </div>
  )
}
