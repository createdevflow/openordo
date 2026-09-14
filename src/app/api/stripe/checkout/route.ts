import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // TODO: Integrate Stripe
  // 1. Get plan details from request
  // 2. Create Stripe Checkout Session
  // 3. Return session URL

  return NextResponse.json({ url: "/dashboard" })
}
