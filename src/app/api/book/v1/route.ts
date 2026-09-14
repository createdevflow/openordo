import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    // Validate API key from header
    const apiKey = req.headers.get("x-api-key")
    if (!apiKey) {
      return NextResponse.json({ error: "Missing X-API-Key header" }, { status: 401 })
    }

    // Find the clinic that has this API key in billingConfig
    const clinics = await db.clinic.findMany({
      where: { billingConfig: { contains: apiKey } }
    })
    const clinic = clinics.find(c => {
      try {
        const cfg = JSON.parse(c.billingConfig || "{}")
        return cfg.apiKey === apiKey
      } catch { return false }
    })

    if (!clinic) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    const body = await req.json()
    const { name, email, phone, doctorId, date, time, reason, notes } = body

    if (!name || !email || !phone || !date || !time || !reason) {
      return NextResponse.json({ error: "Missing required fields: name, email, phone, date, time, reason" }, { status: 400 })
    }

    const booking = await db.bookingRequest.create({
      data: {
        clinicId: clinic.id,
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

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        createdAt: booking.createdAt
      }
    })
  } catch (err) {
    console.error("API booking error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
