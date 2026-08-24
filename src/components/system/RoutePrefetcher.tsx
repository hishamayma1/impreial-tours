'use client'

import { useEffect } from 'react'

import { useRouter } from '@/i18n/navigation'

/**
 * Warms the main service routes once the first page is idle.
 *
 * Next already prefetches <Link>s as they enter the viewport, which covers links the
 * visitor can see. This covers the ones they cannot: the routes behind a dropdown, or
 * below the fold on a long home page. By the time they click, the RSC payload and the
 * route's JS chunk are usually already cached.
 *
 * Three deliberate constraints:
 *  - It waits for `requestIdleCallback`, so prefetching never competes with the work
 *    that makes the current page interactive.
 *  - It skips entirely on a metered or slow connection, and when the visitor has
 *    asked to reduce data use. Prefetching costs someone else's bandwidth.
 *  - Routes are warmed one per idle slot rather than all at once, so a burst of
 *    requests cannot starve a navigation the visitor actually made.
 */
const ROUTES = [
  '/tours/daily',
  '/tours/experiences',
  '/hotels',
  '/transfers',
  '/bicycles',
] as const

type NetworkInformation = { saveData?: boolean; effectiveType?: string }

const shouldPrefetch = (): boolean => {
  if (typeof navigator === 'undefined') return false

  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection
  if (connection?.saveData) return false
  if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) return false

  return true
}

export const RoutePrefetcher = () => {
  const router = useRouter()

  useEffect(() => {
    if (!shouldPrefetch()) return

    const queue = [...ROUTES]
    let cancelled = false
    let handle: number | undefined

    const idle: typeof requestIdleCallback =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback
        : // Safari has no requestIdleCallback; a timeout keeps the behaviour, not the timing.
          ((callback: IdleRequestCallback) =>
            setTimeout(
              () => callback({ didTimeout: true, timeRemaining: () => 0 }),
              300,
            ) as unknown as number)

    const pump = () => {
      if (cancelled) return
      const next = queue.shift()
      if (!next) return

      router.prefetch(next)
      handle = idle(pump, { timeout: 2000 })
    }

    handle = idle(pump, { timeout: 2000 })

    return () => {
      cancelled = true
      if (handle !== undefined && typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(handle)
      }
    }
  }, [router])

  return null
}
