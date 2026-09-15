/**
 * Simple in-memory rate limiter for server actions.
 * In a production multi-instance deployment, this should be backed by Redis.
 */

type RateLimitEntry = {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Throttles requests based on an identifier (like IP + Action name).
 * @param identifier Unique key (e.g. `login_192.168.1.1`)
 * @param limit Max allowed requests within the window
 * @param windowMs Time window in milliseconds
 * @returns boolean `true` if allowed, `false` if rate limited
 */
export function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // Clean up expired entry
  if (entry && now > entry.resetAt) {
    rateLimitStore.delete(identifier)
  }

  const current = rateLimitStore.get(identifier)

  if (!current) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    })
    return true
  }

  if (current.count >= limit) {
    return false
  }

  current.count += 1
  return true
}

/**
 * Returns a progressive delay based on failed attempts to prevent brute force.
 * E.g. attempt 1: 0ms, attempt 2: 1000ms, attempt 3: 2000ms...
 */
export async function applyProgressiveDelay(identifier: string, baseDelayMs: number = 1000): Promise<void> {
  const entry = rateLimitStore.get(identifier)
  if (!entry) return
  
  const delay = Math.max(0, (entry.count - 1) * baseDelayMs)
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}
