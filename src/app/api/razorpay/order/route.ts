import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require("razorpay")

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { getRazorpayKeyId, getRazorpayKeySecret, isRazorpayBypassMode } = await import("@/lib/razorpay-utils")
  const bypass = await isRazorpayBypassMode()
  const key_id = await getRazorpayKeyId()
  const key_secret = await getRazorpayKeySecret()
  
  if (!bypass && (!key_id || !key_secret)) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 })
  }

  try {
    const { itemId, quantity = 1 } = await req.json()
    const clinicId = await requireClinicId()

    if (bypass) {
      return NextResponse.json({ bypass: true, success: true, id: "order_bypass", amount: 0, keyId: "bypass" })
    }

    const plugin = await db.plugin.findUnique({ where: { id: itemId } })
    if (!plugin || !plugin.priceOneTimeINR) throw new Error("Plugin not found or missing one-time price")

    const rzp = new Razorpay({ key_id, key_secret })

    const order = await rzp.orders.create({
      amount: plugin.priceOneTimeINR * quantity, // already in paise in DB
      currency: "INR",
      notes: { clinicId, type: "PLUGIN", itemId }
    })

    return NextResponse.json({ id: order.id, amount: order.amount, keyId: key_id })
  } catch (err: any) {
    console.error("razorpay order error:", JSON.stringify(err?.error || err?.message || err, null, 2))
    return NextResponse.json({ error: err?.error?.description || err?.message || "Failed" }, { status: 500 })
  }
}
