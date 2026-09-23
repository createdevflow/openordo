import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  // Simple bearer token check for the cron job (in production, use a secure secret)
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'dev-cron-secret'}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Find users who were soft-deleted more than 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const expiredUsers = await db.user.findMany({
      where: {
        status: "SOFT_DELETED",
        deletedAt: {
          lte: thirtyDaysAgo,
        },
      },
      select: { id: true, email: true },
    })

    if (expiredUsers.length === 0) {
      return NextResponse.json({ message: "No expired accounts to delete." })
    }

    // Delete them (Cascade will handle related records if configured in schema)
    const userIds = expiredUsers.map(u => u.id)
    
    await db.user.deleteMany({
      where: {
        id: { in: userIds },
      },
    })

    return NextResponse.json({
      message: `Successfully deleted ${expiredUsers.length} accounts.`,
      deletedUserIds: userIds,
    })
  } catch (error) {
    console.error("Failed to run cleanup cron:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
