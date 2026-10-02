/**
 * Simple in-memory rate limiter for API routes.
 * Proportionate for single-outlet deployment — no Redis/external dependency.
 *
 * Usage:
 *   const rateLimit = createRateLimiter({ windowMs: 60_000, max: 30 })
 *   const result = rateLimit(clientKey)
 *   if (!result.allowed) return 429
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Periodic cleanup to prevent memory bloat
const CLEANUP_INTERVAL_MS = 10 * 60_000 // 10 minutes
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}

export function createRateLimiter(options: {
  windowMs: number
  max: number
}) {
  const { windowMs, max } = options

  return function rateLimit(key: string): RateLimitResult {
    cleanup()

    const now = Date.now()
    const existing = store.get(key)

    if (!existing || now > existing.resetAt) {
      // New window
      store.set(key, { count: 1, resetAt: now + windowMs })
      return { allowed: true, remaining: max - 1, resetAt: now + windowMs }
    }

    if (existing.count >= max) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt }
    }

    existing.count++
    return { allowed: true, remaining: max - existing.count, resetAt: existing.resetAt }
  }
}

/**
 * Extract a client key from the request.
 * Uses x-forwarded-for (Vercel) or x-real-ip, falls back to 'unknown'.
 */
export function getClientKey(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    // x-forwarded-for can be "client, proxy1, proxy2" — take the first
    return fwd.split(',')[0].trim()
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}
