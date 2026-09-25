/**
 * Meta WhatsApp Cloud API client.
 * All functions here are server-side only.
 *
 * API reference: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

export interface MetaCredentials {
  phoneNumberId: string
  accessToken: string // plaintext (caller decrypts before passing in)
}

const BASE_URL = "https://graph.facebook.com/v19.0"

/** Send a template message via the Meta Cloud API. */
export async function sendTemplateMessage({
  credentials,
  toPhone,
  templateName,
  languageCode = "en",
  components = [],
}: {
  credentials: MetaCredentials
  toPhone: string
  templateName: string
  languageCode?: string
  components?: Array<{
    type: "body" | "header" | "button"
    parameters: Array<{ type: "text"; text: string }>
  }>
}): Promise<{ success: true; messageId: string } | { success: false; error: string }> {
  try {
    const res = await fetch(
      `${BASE_URL}/${credentials.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: normalisePhone(toPhone),
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            components: components.length > 0 ? components : undefined,
          },
        }),
      }
    )
    const json = await res.json()
    if (!res.ok) {
      const errMsg =
        json?.error?.message ||
        json?.error?.error_data?.details ||
        `HTTP ${res.status}`
      return { success: false, error: errMsg }
    }
    const messageId = json?.messages?.[0]?.id || "unknown"
    return { success: true, messageId }
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error" }
  }
}

/**
 * Test credentials by fetching the phone number profile.
 * Returns the display phone number on success.
 */
export async function testWhatsAppConnection(credentials: MetaCredentials): Promise<
  { success: true; displayPhone: string } | { success: false; error: string }
> {
  try {
    const res = await fetch(
      `${BASE_URL}/${credentials.phoneNumberId}?fields=display_phone_number,verified_name`,
      {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
        cache: "no-store",
      }
    )
    const json = await res.json()
    if (!res.ok) {
      const errMsg = json?.error?.message || `HTTP ${res.status}`
      return { success: false, error: errMsg }
    }
    return {
      success: true,
      displayPhone: json.display_phone_number || json.verified_name || "Connected",
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error" }
  }
}

/**
 * Verify an incoming webhook challenge from Meta.
 * Returns the hub.challenge value if valid, null if not.
 */
export function verifyWebhookChallenge(params: {
  mode: string
  token: string
  challenge: string
  storedVerifyToken: string
}): string | null {
  if (params.mode === "subscribe" && params.token === params.storedVerifyToken) {
    return params.challenge
  }
  return null
}

/**
 * Verify the X-Hub-Signature-256 header on an incoming webhook payload.
 */
import { createHmac } from "crypto"

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  appSecret: string
): boolean {
  if (!signatureHeader.startsWith("sha256=")) return false
  const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex")
  return expected === signatureHeader
}

/** Normalise phone: strip spaces/dashes, ensure leading +. */
function normalisePhone(phone: string): string {
  let p = phone.replace(/[\s\-().]/g, "")
  if (!p.startsWith("+")) p = "+" + p
  return p
}
