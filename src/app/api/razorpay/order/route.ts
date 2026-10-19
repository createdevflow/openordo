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
    const { itemId, quantity = 1, currency: requestedCurrency } = await req.json()
    const clinicId = await requireClinicId()

    if (bypass) {
      return NextResponse.json({ bypass: true, success: true, id: "order_bypass", amount: 0, keyId: "bypass" })
    }

    const plugin = await db.plugin.findUnique({ where: { id: itemId } })
    if (!plugin) throw new Error("Plugin not found")

    const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
    const currency: "INR" | "USD" = requestedCurrency === "USD" || requestedCurrency === "INR" 
      ? requestedCurrency 
      : (clinic?.countryCode === "IN" ? "INR" : "USD")

    const rawPrice = currency === "INR" ? plugin.priceOneTimeINR : plugin.priceOneTimeUSD
    if (!rawPrice) throw new Error(`Plugin missing one-time price for ${currency}`)

    const rzp = new Razorpay({ key_id, key_secret })

    const baseAmount = rawPrice * quantity
    
    // Fetch applicable tax percentage (formerly platform fee)
    const feeSetting = await db.globalSetting.findUnique({ where: { key: "PLATFORM_FEE_PERCENTAGE" } }).catch(() => null)
    const taxRate = parseFloat(feeSetting?.value || "18")
    let taxAmount = 0
    if (!isNaN(taxRate) && taxRate > 0) {
      taxAmount = Math.round(baseAmount * (taxRate / 100))
    }

    const totalAmount = baseAmount + taxAmount

    const order = await rzp.orders.create({
      amount: totalAmount, // in paise or cents
      currency: currency,
      notes: { clinicId, type: "PLUGIN", itemId, currency }
    })

    return NextResponse.json({ 
      id: order.id, 
      amount: order.amount, 
      currency,
      keyId: key_id, 
      platformFee: taxAmount,
      taxAmount 
    })
  } catch (err: any) {
    console.error("razorpay order error:", JSON.stringify(err?.error || err?.message || err, null, 2))
    return NextResponse.json({ error: err?.error?.description || err?.message || "Failed" }, { status: 500 })
  }
}
