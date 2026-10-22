import { db } from "@/lib/db"

export interface SlotCapacityConfig {
  defaultCapacity: number
  slotOverrides: Record<string, number>
}

/**
 * Generates an array of time slots (e.g. ["09:00", "09:30", ...])
 * dynamically based on clinic openTime and closeTime.
 * Default interval is 30 minutes.
 * If openTime/closeTime are missing or invalid, falls back to 09:00 - 18:00.
 */
export function generateTimeSlots(
  openTime?: string | null,
  closeTime?: string | null,
  intervalMinutes: number = 30
): string[] {
  const parseMinutes = (t?: string | null): number | null => {
    if (!t || typeof t !== "string") return null
    const parts = t.split(":")
    if (parts.length < 2) return null
    const h = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null
    return h * 60 + m
  }

  let startMinutes = parseMinutes(openTime)
  let endMinutes = parseMinutes(closeTime)

  if (startMinutes === null) startMinutes = 9 * 60
  if (endMinutes === null) endMinutes = 18 * 60

  // If start >= end (e.g. overnight or invalid), fallback to 09:00 - 18:00
  if (startMinutes >= endMinutes) {
    startMinutes = 9 * 60
    endMinutes = 18 * 60
  }

  const slots: string[] = []
  // Generate slots such that each slot begins at m and lasts intervalMinutes
  // A slot is included if it begins before endMinutes (m + interval <= endMinutes)
  for (let m = startMinutes; m + intervalMinutes <= endMinutes; m += intervalMinutes) {
    const hh = Math.floor(m / 60).toString().padStart(2, "0")
    const mm = (m % 60).toString().padStart(2, "0")
    slots.push(`${hh}:${mm}`)
  }

  // Fallback if interval is too large or no slots fit
  if (slots.length === 0) {
    const hh = Math.floor(startMinutes / 60).toString().padStart(2, "0")
    const mm = (startMinutes % 60).toString().padStart(2, "0")
    slots.push(`${hh}:${mm}`)
  }

  return slots
}

export const DEFAULT_BOOKING_TIME_SLOTS = generateTimeSlots("09:00", "18:00")

export function formatTime12h(timeStr: string): string {
  if (!timeStr) return ""
  const [hStr, mStr] = timeStr.split(":")
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr || "0", 10)
  const suffix = h >= 12 ? "PM" : "AM"
  const hr = ((h - 1) % 12 + 1).toString().padStart(2, "0")
  return `${hr}:${m.toString().padStart(2, "0")} ${suffix}`
}

export function parseSlotCapacityConfig(billingConfigStr?: string | null): SlotCapacityConfig {
  const defaults: SlotCapacityConfig = {
    defaultCapacity: 1,
    slotOverrides: {}
  }
  if (!billingConfigStr) return defaults
  try {
    const parsed = typeof billingConfigStr === "string" ? JSON.parse(billingConfigStr) : billingConfigStr
    if (parsed && parsed.slotCapacities) {
      return {
        defaultCapacity: Math.max(1, Number(parsed.slotCapacities.defaultCapacity) || 1),
        slotOverrides: typeof parsed.slotCapacities.slotOverrides === "object" && parsed.slotCapacities.slotOverrides !== null
          ? parsed.slotCapacities.slotOverrides
          : {}
      }
    }
  } catch {}
  return defaults
}

export async function getBookedSlotCounts(clinicId: string, dateStr: string): Promise<Record<string, number>> {
  if (!clinicId || !dateStr) return {}

  // 1. Pending booking requests on that date (these reserve a slot)
  const pendingRequests = await db.bookingRequest.findMany({
    where: {
      clinicId,
      date: dateStr,
      status: "PENDING"
    },
    select: { time: true }
  })

  // 2. Active appointments on that date (startOfDay to endOfDay)
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`)
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`)

  const appointments = await db.appointment.findMany({
    where: {
      clinicId,
      date: {
        gte: startOfDay,
        lte: endOfDay
      },
      status: {
        notIn: ["cancelled", "CANCELLED", "no_show", "NO_SHOW"]
      }
    },
    select: { time: true }
  })

  const counts: Record<string, number> = {}

  for (const req of pendingRequests) {
    if (req.time) {
      counts[req.time] = (counts[req.time] || 0) + 1
    }
  }

  for (const appt of appointments) {
    if (appt.time) {
      counts[appt.time] = (counts[appt.time] || 0) + 1
    }
  }

  return counts
}
