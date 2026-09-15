"use client"

import { useState } from "react"
import { submitContactLead } from "@/server/actions/contact"
import { Button } from "@/components/ui/Button"

export function ContactForm() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setStatus("idle")
    
    const formData = new FormData(e.currentTarget)
    const result = await submitContactLead(formData)
    
    if (result.error) {
      setStatus("error")
      setErrorMsg(result.error)
    } else {
      setStatus("success")
      ;(e.target as HTMLFormElement).reset()
    }
    
    setLoading(false)
  }

  if (status === "success") {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 bg-forest-soft text-forest rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <h3 className="text-xl font-bold text-ink mb-2">Message sent!</h3>
        <p className="text-ink-soft">Thanks for reaching out. Our team will get back to you shortly.</p>
        <Button className="mt-6" variant="ghost" onClick={() => setStatus("idle")}>Send another message</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {status === "error" && (
        <div className="bg-coral-soft text-coral p-3 rounded-md text-sm font-medium">
          {errorMsg}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-[13.5px] font-semibold text-ink mb-1.5">Your Name</label>
          <input 
            type="text" 
            name="name" 
            required 
            className="w-full h-11 px-3.5 bg-paper border border-line rounded-control text-[14.5px] focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest transition-shadow"
            placeholder="Dr. John Doe"
          />
        </div>
        <div>
          <label className="block text-[13.5px] font-semibold text-ink mb-1.5">Email Address</label>
          <input 
            type="email" 
            name="email" 
            required 
            className="w-full h-11 px-3.5 bg-paper border border-line rounded-control text-[14.5px] focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest transition-shadow"
            placeholder="john@clinic.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-[13.5px] font-semibold text-ink mb-1.5">How can we help?</label>
        <textarea 
          name="message" 
          required 
          rows={5}
          className="w-full p-3.5 bg-paper border border-line rounded-control text-[14.5px] focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest transition-shadow resize-y"
          placeholder="I'm interested in migrating my clinic..."
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full h-12 text-[15px] font-bold mt-2">
        {loading ? "Sending..." : "Send Message"}
      </Button>
    </form>
  )
}
