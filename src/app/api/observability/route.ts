import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { level, source, message, stack, url, userId, clinicId, metadata } = body

    await db.systemErrorLog.create({
      data: {
        level: level || "ERROR",
        source: source || "CLIENT",
        message: message || "Unknown error",
        stack,
        url,
        userId,
        clinicId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to process client-side observability log:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
