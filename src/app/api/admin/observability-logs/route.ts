import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    // Only allow Super Admins
    if (!session || session.user?.platformRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const logs = await db.systemErrorLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100, // Fetch the latest 100 logs
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Failed to fetch observability logs:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
