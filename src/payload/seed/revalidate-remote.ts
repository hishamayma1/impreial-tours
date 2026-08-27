/**
 * Asks a running server to drop cached reads, from a script that cannot do it itself.
 *
 * Scripts started with `payload run` talk to MongoDB directly. They have no Next
 * request context, so the collections' `afterChange` hooks cannot call `revalidateTag`
 * (see ../hooks/revalidate.ts) and the site keeps serving the pre-write content for up
 * to an hour. That cache lives on disk under `.next/cache`, so it survives a dev-server
 * restart as well — which makes the staleness look like a bug in the script.
 *
 * This posts to /api/revalidate instead, where the tag can actually be busted.
 *
 * Best-effort by design: no server running, or no `REVALIDATE_SECRET` configured, is
 * the normal case for a seed on a fresh machine, and neither should fail the write
 * that already succeeded. It reports what happened and returns.
 */
export const revalidateRemote = async (
  tags: string[],
  log: (message: string) => void = console.log,
): Promise<void> => {
  const secret = process.env.REVALIDATE_SECRET
  const base = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

  if (!secret) {
    log('REVALIDATE_SECRET is not set — skipping cache revalidation. Restart the server to see changes.')
    return
  }

  try {
    const response = await fetch(`${base}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, tags }),
      // A server that is not running should fail fast, not hang the script.
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      log(`revalidated ${tags.length} cache tag(s) on ${base}`)
      return
    }

    log(`revalidation refused by ${base}: ${response.status}. Restart the server to see changes.`)
  } catch {
    log(`no server reachable at ${base} — changes appear next time it starts.`)
  }
}
