"use client"

import { usePathname } from "next/navigation"

export function ViewTitle() {
  const pathname = usePathname()
  
  if (pathname === '/dashboard') return <>Overview</>
  if (pathname.startsWith('/dashboard/patients')) return <>Patients</>
  if (pathname.startsWith('/dashboard/appointments')) return <>Appointments</>
  if (pathname.startsWith('/dashboard/doctors')) return <>Doctors & Staff</>
  if (pathname.startsWith('/dashboard/billing')) return <>Billing</>
  if (pathname.startsWith('/dashboard/records')) return <>Medical Records</>
  if (pathname.startsWith('/dashboard/settings')) return <>Settings</>
  if (pathname.startsWith('/dashboard/bookings')) return <>Booking Requests</>
  
  return <>Dashboard</>
}
