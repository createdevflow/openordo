import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyWebhookChallenge, verifyWebhookSignature } from "@/lib/whatsapp"

/**
 * Handle Meta webhook challenge (GET).
 * Used when setting up the webhook in Meta Business Manager.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const mode = url.searchParams.get("hub.mode")
  const token = url.searchParams.get("hub.verify_token")
  const challenge = url.searchParams.get("hub.challenge")

  if (mode === "subscribe" && token && challenge) {
    const settings = await db.platformCommunicationSettings.findFirst()
    if (settings && settings.whatsappWebhookVerifyToken) {
      const result = verifyWebhookChallenge({
        mode,
        token,
        challenge,
        storedVerifyToken: settings.whatsappWebhookVerifyToken
      })
      if (result) {
        // Return 200 with just the challenge string as required by Meta
        return new NextResponse(result, { status: 200, headers: { "Content-Type": "text/plain" } })
      }
    }
  }

  return new NextResponse("Forbidden", { status: 403 })
}

/**
 * Handle incoming webhooks from Meta (POST).
 * Currently used to capture delivery receipts / status updates for sent messages.
 */
export async function POST(req: Request) {
  // 1. Verify signature
  const signature = req.headers.get("x-hub-signature-256")
  if (!signature) {
    return new NextResponse("Missing signature", { status: 401 })
  }

  const rawBody = await req.text()
  
  // NOTE: Meta uses the App Secret to sign webhooks. In this app, we expect META_APP_SECRET
  // to be defined in environment variables. If not provided, we reject the webhook for safety,
  // unless we're in development mode bypassing validation.
  const appSecret = process.env.META_APP_SECRET
  if (appSecret) {
    const isValid = verifyWebhookSignature(rawBody, signature, appSecret)
    if (!isValid) {
      return new NextResponse("Invalid signature", { status: 401 })
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error("META_APP_SECRET is not set. Cannot verify webhook signatures.")
    return new NextResponse("Server Configuration Error", { status: 500 })
  }

  // 2. Parse payload
  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 })
  }

  // 3. Process status updates
  if (payload.object === "whatsapp_business_account" && payload.entry) {
    for (const entry of payload.entry) {
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.value?.statuses) {
            for (const statusObj of change.value.statuses) {
              const { id, status } = statusObj
              if (id && status) {
                const upperStatus = status.toUpperCase()
                if (["SENT", "DELIVERED", "READ", "FAILED"].includes(upperStatus)) {
                  try {
                    await db.whatsAppMessageLog.updateMany({
                      where: { metaMessageId: id },
                      data: { status: upperStatus }
                    })
                  } catch (e) {
                    console.error("Failed to update message status:", e)
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // Meta expects a 200 OK immediately
  return new NextResponse("EVENT_RECEIVED", { status: 200 })
}
