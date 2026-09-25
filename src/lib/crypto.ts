/**
 * AES-256-GCM application-level encryption for sensitive credentials.
 * The key comes from WHATSAPP_ENCRYPTION_KEY env var (32-byte hex string).
 * This runs ONLY server-side — never import this in client components.
 *
 * Format of ciphertext stored in DB: "iv_hex:authTag_hex:encrypted_hex"
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

function getKey(): Buffer {
  const hex = process.env.WHATSAPP_ENCRYPTION_KEY
  if (!hex) {
    // Fall back to a derived key from AUTH_SECRET for dev convenience.
    // In production, set WHATSAPP_ENCRYPTION_KEY to a 64-char hex string.
    const secret = process.env.AUTH_SECRET || "dev-fallback-secret-32-bytes-pad!!"
    const padded = secret.padEnd(32, "0").slice(0, 32)
    return Buffer.from(padded, "utf8")
  }
  if (hex.length !== 64) {
    throw new Error("WHATSAPP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)")
  }
  return Buffer.from(hex, "hex")
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ""
  const parts = ciphertext.split(":")
  if (parts.length !== 3) {
    // Treat legacy/unencrypted values as plain text (migration safety net)
    return ciphertext
  }
  const [ivHex, authTagHex, encryptedHex] = parts
  const key = getKey()
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")
  const encrypted = Buffer.from(encryptedHex, "hex")
  const decipher = createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8")
}

/** Returns last 4 chars of plaintext, prefixed with bullet mask. */
export function maskToken(ciphertext: string): string {
  if (!ciphertext) return ""
  try {
    const plain = decrypt(ciphertext)
    if (plain.length <= 4) return "••••"
    return "••••••••" + plain.slice(-4)
  } catch {
    return "••••••••[error]"
  }
}
