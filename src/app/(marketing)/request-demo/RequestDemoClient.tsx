"use client"

import React, { useState } from "react"
import { createDemoRequestAction } from "@/server/actions/demo"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

export function RequestDemoClient({ videoUrl }: { videoUrl: string | null }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    jobTitle: "",
    country: "",
    phone: "",
    companyName: "",
    employees: "1-10",
    message: "",
    newsletterOptIn: false
  })
  
  const [status, setStatus] = useState<"IDLE" | "LOADING" | "SUCCESS" | "ERROR">("IDLE")
  const [errorMsg, setErrorMsg] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("LOADING")
    const res = await createDemoRequestAction(formData)
    if (res.error) {
      setErrorMsg(res.error)
      setStatus("ERROR")
    } else {
      setStatus("SUCCESS")
    }
  }

  return (
    <div className="w-full">
      {/* Hero Section with Form */}
      <section className="bg-gradient-to-b from-paper to-paper-raised border-b border-line py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          
          {/* Left Column */}
          <div className="pt-8">
            <div className="text-moss font-semibold tracking-wider text-sm uppercase mb-4">Contact Sales</div>
            <h1 className="text-4xl md:text-5xl font-black text-ink mb-6 leading-tight">
              Request a demo <span className="inline-block text-forest">↗</span>
            </h1>
            <p className="text-lg text-ink-soft mb-12 leading-relaxed max-w-lg">
              Deliver Breakthrough Patient Experiences With The Most Powerful Practice Management Solution Built For Modern Clinics.
            </p>

            <div className="mb-8 font-semibold text-ink">Clinics who use OpenORDO enjoyed improvements in many ways:</div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-line shadow-sm">
                <div className="text-3xl font-black text-forest mb-2">3x</div>
                <div className="text-sm text-ink-soft leading-tight">Faster prescription drafting</div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-line shadow-sm">
                <div className="text-3xl font-black text-forest mb-2">4x</div>
                <div className="text-sm text-ink-soft leading-tight">Growth in new patients</div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-line shadow-sm">
                <div className="text-3xl font-black text-forest mb-2">39%</div>
                <div className="text-sm text-ink-soft leading-tight">Decrease in no-show rates</div>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-line relative z-10">
            {status === "SUCCESS" ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-forest-soft text-forest rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-2xl font-bold text-ink mb-4">Request Received!</h2>
                <p className="text-ink-soft">
                  Thank you for your interest in OpenORDO. Our sales team will review your request and reach out shortly with a demo link.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h3 className="text-xl font-bold text-ink mb-6">Request a demo by filling the form</h3>
                
                {status === "ERROR" && (
                  <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{errorMsg}</div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">First Name *</label>
                    <Input required placeholder="John" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} disabled={status === "LOADING"} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Last Name *</label>
                    <Input required placeholder="Doe" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} disabled={status === "LOADING"} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Work email *</label>
                    <Input required type="email" placeholder="john@clinic.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={status === "LOADING"} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Job title</label>
                    <Input placeholder="e.g. Practice Manager" value={formData.jobTitle} onChange={e => setFormData({ ...formData, jobTitle: e.target.value })} disabled={status === "LOADING"} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Country</label>
                    <Input placeholder="United States" value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} disabled={status === "LOADING"} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Phone number</label>
                    <Input placeholder="+1 (555) 000-0000" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} disabled={status === "LOADING"} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Company name</label>
                    <Input placeholder="Clinic Name" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} disabled={status === "LOADING"} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Number of employees</label>
                    <select className="flex h-10 w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.employees} onChange={e => setFormData({ ...formData, employees: e.target.value })} disabled={status === "LOADING"}>
                      <option value="1-10">1 - 10</option>
                      <option value="11-50">11 - 50</option>
                      <option value="51-200">51 - 200</option>
                      <option value="201+">201+</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Message</label>
                  <textarea 
                    placeholder="Write your message here..."
                    className="flex min-h-[80px] w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    disabled={status === "LOADING"}
                  />
                </div>

                <div className="flex items-start gap-2 pt-2">
                  <input type="checkbox" id="newsletter" className="mt-1" checked={formData.newsletterOptIn} onChange={e => setFormData({ ...formData, newsletterOptIn: e.target.checked })} disabled={status === "LOADING"} />
                  <label htmlFor="newsletter" className="text-sm text-ink-soft cursor-pointer">Please subscribe me to the OpenORDO newsletter</label>
                </div>

                <Button className="w-full justify-center mt-4 h-12 text-base font-semibold" type="submit" disabled={status === "LOADING"}>
                  {status === "LOADING" ? "Submitting..." : "Send to sales"}
                </Button>
                
                <p className="text-xs text-center text-ink-soft mt-4">
                  By clicking submit you agree to our Privacy Policy and Service Agreement.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Brands Section */}
      <section className="py-16 bg-white border-b border-line text-center">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sm font-medium text-ink-soft mb-10">Hundreds of clinics and practices across the world rely on OpenORDO.</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-300">
            {/* Dummy brand logos/text */}
            <div className="font-black text-xl tracking-tight">MedCorp</div>
            <div className="font-black text-xl tracking-tight">HealthPlus</div>
            <div className="font-black text-xl tracking-tight">CareFirst</div>
            <div className="font-black text-xl tracking-tight">ApexClinic</div>
            <div className="font-black text-xl tracking-tight">PrimeCare</div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-24 bg-[#111] text-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
            {videoUrl ? (
              <iframe 
                src={videoUrl.includes("watch?v=") ? videoUrl.replace("watch?v=", "embed/") : videoUrl} 
                className="w-full h-full" 
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              ></iframe>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 bg-white/5">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4">
                  <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-2"></div>
                </div>
                <p>Demo Video Coming Soon</p>
              </div>
            )}
          </div>
          
          <div className="mt-16 text-center">
            <p className="text-white/70 text-sm font-medium max-w-2xl mx-auto">
              Ranked as the highest-rated in our category by users and among the best in the world.
            </p>
            <div className="flex justify-center gap-6 mt-8 opacity-75 flex-wrap">
              <div className="px-4 py-2 border border-white/20 rounded-lg text-xs font-bold uppercase tracking-wider">Top Performer 2024</div>
              <div className="px-4 py-2 border border-white/20 rounded-lg text-xs font-bold uppercase tracking-wider">Quality Choice</div>
              <div className="px-4 py-2 border border-white/20 rounded-lg text-xs font-bold uppercase tracking-wider">Users Love Us</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
