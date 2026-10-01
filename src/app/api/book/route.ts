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

    // Enforce booking page monthly limit
    const limitCheck = await canAcceptBooking(clinicId)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: "This clinic is not accepting online bookings at this time. Please contact the clinic directly." },
        { status: 429 }
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
