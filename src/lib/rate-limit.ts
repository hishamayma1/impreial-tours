/**
 * A small fixed-window limiter for public form endpoints.
 *
 * In-memory and therefore per-instance: it stops casual abuse and accidental
 * double-submits, not a distributed attack. Behind more than one instance this needs
 * to move to Redis or the platform's own limiter — noted rather than pretended away.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/** Bounded so a flood of unique IPs cannot grow the map without limit. */
const MAX_TRACKED = 5_000

export const rateLimit = (
  key: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): { allowed: boolean; retryAfterSeconds: number } => {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED) {
      // Cheap eviction: drop everything already expired, then the oldest entry.
      for (const [k, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(k)
      if (buckets.size >= MAX_TRACKED) buckets.delete(buckets.keys().next().value as string)
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) }
  }

  existing.count += 1
  return { allowed: true, retryAfterSeconds: 0 }
}

/** Best-effort client IP from the proxy headers Next sees. */
export const clientIp = (headers: Headers): string =>
  headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  headers.get('x-real-ip') ||
  'unknown'

/**
 * Verifies a Cloudflare Turnstile token. Returns true when no secret is configured so
 * local development is not blocked — production must set TURNSTILE_SECRET_KEY.
 */
export const verifyCaptcha = async (token: string, ip: string): Promise<boolean> => {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (!token) return false

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    })
    const result = (await response.json()) as { success?: boolean }
    return result.success === true
  } catch {
    // A verification outage must not silently let everything through.
    return false
  }
}
