import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { clinicId, userId } = await req.json()
    
    // Mark user onboarding complete
    await db.user.update({
      where: { id: userId },
      data: { onboardingStep: "COMPLETED" }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("complete onboarding error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
