import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { parseSlotCapacityConfig, getBookedSlotCounts, generateTimeSlots } from "@/lib/slot-capacity"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get("clinicId")
    const dateStr = searchParams.get("date")

    if (!clinicId || !dateStr) {
      return NextResponse.json({ error: "clinicId and date are required" }, { status: 400 })
    }

    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, billingConfig: true, openTime: true, closeTime: true }
    })

    if (!clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    const { defaultCapacity, slotOverrides } = parseSlotCapacityConfig(clinic.billingConfig)
    const bookedCounts = await getBookedSlotCounts(clinicId, dateStr)
    const timeSlots = generateTimeSlots(clinic.openTime, clinic.closeTime)

    // Build slot-by-slot status map
    const slotStatus: Record<string, { capacity: number; booked: number; remaining: number; isFull: boolean }> = {}

    for (const slot of timeSlots) {
      const capacity = slotOverrides[slot] !== undefined ? slotOverrides[slot] : defaultCapacity
      const booked = bookedCounts[slot] || 0
      const remaining = Math.max(0, capacity - booked)
      slotStatus[slot] = {
        capacity,
        booked,
        remaining,
        isFull: booked >= capacity
      }
    }

    return NextResponse.json({
      date: dateStr,
      openTime: clinic.openTime,
      closeTime: clinic.closeTime,
      timeSlots,
      defaultCapacity,
      slotOverrides,
      bookedCounts,
      slotStatus
    })
  } catch (error: any) {
    console.error("[availability] error:", error)
    return NextResponse.json({ error: "Failed to fetch slot availability" }, { status: 500 })
  }
}
