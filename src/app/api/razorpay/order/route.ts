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

    let baseAmount = plugin.priceOneTimeINR * quantity
    
    // Fetch platform fee percentage
    const feeSetting = await db.globalSetting.findUnique({ where: { key: "PLATFORM_FEE_PERCENTAGE" } }).catch(() => null)
    const platformFeeRate = feeSetting?.value || "10"
    const feePercentage = parseFloat(platformFeeRate)
    let platformFee = 0
    if (!isNaN(feePercentage) && feePercentage > 0) {
      platformFee = Math.round(baseAmount * (feePercentage / 100))
    }

    let totalAmount = baseAmount + platformFee

    // Optionally calculate GST to add to Razorpay order amount if GST is configured
    // For INR, we should include GST in the checkout amount. 
    // Wait, the current code just charged priceOneTimeINR directly. Let's keep it simple and just add the platform fee for now, 
    // or add GST if that was also missing. 
    // We will just add the platform fee so it matches what tax-invoice will calculate.
    
    // We should ideally calculate GST here too, but to be safe, I'll just add platform fee.
    // Wait, if tax-invoice.ts adds GST, the invoice totalValue will be greater than the Razorpay amount!
    // The previous code didn't add GST to the Razorpay amount. It just charged `plugin.priceOneTimeINR * quantity`.
    // Let's add GST here!

    const supplierStateSetting = await db.globalSetting.findUnique({ where: { key: "GST_SUPPLIER_STATE" } }).catch(() => null)
    const supplierState = supplierStateSetting?.value || ""
    const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
    let placeOfSupply = ""
    try {
      placeOfSupply = JSON.parse(clinic?.billingConfig || "{}").state || ""
    } catch { }

    if (supplierState && placeOfSupply) {
      const isIntraState = supplierState.trim().toLowerCase() === placeOfSupply.trim().toLowerCase()
      const totalGst = Math.round(totalAmount * 0.18) // 18% GST
      totalAmount += totalGst
    }

    const order = await rzp.orders.create({
      amount: totalAmount, // already in paise
      currency: "INR",
      notes: { clinicId, type: "PLUGIN", itemId }
    })

    return NextResponse.json({ id: order.id, amount: order.amount, keyId: key_id, platformFee })
  } catch (err: any) {
    console.error("razorpay order error:", JSON.stringify(err?.error || err?.message || err, null, 2))
    return NextResponse.json({ error: err?.error?.description || err?.message || "Failed" }, { status: 500 })
  }
}
