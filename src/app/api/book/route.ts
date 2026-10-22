import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { canAcceptBooking } from "@/lib/features"
import { checkRateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown"
    if (!checkRateLimit(`booking_api_${ip}`, 10, 60000)) { // 10 requests per minute
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
    }

    const body = await req.json()
    const { clinicId, name, email, phone, doctorId, date, time, reason, notes } = body

    if (!clinicId || !name || !email || !phone || !date || !time || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
    if (!clinic || clinic.status !== "ACTIVE") {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    // Enforce booking page feature and monthly limit
    const limitCheck = await canAcceptBooking(clinicId)
    if (!limitCheck.allowed) {
      const errorMsg = limitCheck.featureDisabled
        ? "Online booking is not enabled for this clinic. Please contact the clinic directly."
        : "This clinic has reached its monthly online booking capacity. Please contact the clinic directly."
      return NextResponse.json(
        { error: errorMsg },
        { status: limitCheck.featureDisabled ? 403 : 429 }
      )
    }

    // Enforce per-slot capacity limits
    const { parseSlotCapacityConfig, getBookedSlotCounts, formatTime12h, generateTimeSlots } = await import("@/lib/slot-capacity")
    const clinicSlots = generateTimeSlots(clinic.openTime, clinic.closeTime)
    if (!clinicSlots.includes(time)) {
      return NextResponse.json(
        { error: "The selected time slot is outside of this clinic's operating hours." },
        { status: 400 }
      )
    }

    const { defaultCapacity, slotOverrides } = parseSlotCapacityConfig(clinic.billingConfig)
    const slotMax = slotOverrides[time] !== undefined ? slotOverrides[time] : defaultCapacity
    const bookedCounts = await getBookedSlotCounts(clinicId, date)
    const currentBooked = bookedCounts[time] || 0

    if (currentBooked >= slotMax) {
      const formattedTime = formatTime12h(time) || time
      return NextResponse.json(
        { error: `The ${formattedTime} slot is already fully booked for this date (${currentBooked}/${slotMax} patients). Please choose another time.` },
        { status: 409 }
      )
    }

    const booking = await db.bookingRequest.create({
      data: {
        clinicId,
        name,
        email,
        phone,
        doctorId: doctorId || null,
        date,
        time,
        reason,
        notes: notes || null,
        status: "PENDING"
      }
    })

    return NextResponse.json({ success: true, id: booking.id })
  } catch (err) {
    console.error("Booking error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
