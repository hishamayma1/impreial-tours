import { timingSafeEqual } from 'node:crypto'

import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

/**
 * On-demand cache invalidation for writes that happen outside a request.
 *
 * Every read in lib/payload is wrapped in `unstable_cache` and tagged with its
 * collection or global slug, and the Payload `afterChange` hooks bust those tags — but
 * only when the write goes through the running server. A write from `payload run`
 * (seeding, `demo:offers`, a migration) has no Next request context, so `revalidateTag`
 * cannot fire there; see src/payload/hooks/revalidate.ts. Those writes previously left
 * the site serving stale content for up to an hour with no way to force a refresh
 * short of deleting `.next/cache`, and because that cache is on disk it survived a
 * dev-server restart too.
 *
 * `REVALIDATE_SECRET` has been documented in .env.example since the beginning for
 * exactly this; this is the route that finally reads it.
 *
 *   curl -X POST localhost:3000/api/revalidate \
 *     -H 'content-type: application/json' \
 *     -d '{"secret":"...","tags":["tours"]}'
 */

const MAX_TAGS = 20

/** Constant-time compare, so the response time cannot be used to guess the secret. */
const secretMatches = (provided: string, expected: string): boolean => {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  // timingSafeEqual throws on a length mismatch, which would itself leak the length.
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export const POST = async (request: Request) => {
  const expected = process.env.REVALIDATE_SECRET

  /**
   * An unset secret disables the route rather than opening it. Defaulting to "no
   * secret required" would leave any deployment that forgot the variable with a
   * public endpoint for dumping its own cache.
   */
  if (!expected) {
    return NextResponse.json({ success: false, error: 'not_configured' }, { status: 503 })
  }

  let body: { secret?: unknown; tags?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 })
  }

  const provided = typeof body.secret === 'string' ? body.secret : ''
  if (!secretMatches(provided, expected)) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
  }

  const tags = Array.isArray(body.tags)
    ? [...new Set(body.tags.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0))]
    : []

  if (tags.length === 0) {
    return NextResponse.json({ success: false, error: 'no_tags' }, { status: 400 })
  }
  if (tags.length > MAX_TAGS) {
    return NextResponse.json({ success: false, error: 'too_many_tags' }, { status: 400 })
  }

  for (const tag of tags) revalidateTag(tag)

  return NextResponse.json({ success: true, revalidated: tags })
}
