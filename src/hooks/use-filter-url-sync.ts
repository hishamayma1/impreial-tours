'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

import { useRouter, usePathname } from '@/i18n/navigation'
import { useFilterStore, filtersToSearchParams, type FilterState } from '@/stores/filter-store'

const DEBOUNCE_MS = 300

/**
 * Keeps the filter store and the URL in step, in both directions.
 *
 * On mount (and on a back/forward navigation) the URL seeds the store. Afterwards a
 * store change is written back to the URL on a 300ms debounce, so dragging a price
 * slider produces one navigation rather than forty.
 *
 * The write is a `replace`, not a `push`: filter tweaks should not each become a
 * separate history entry the visitor has to click back through.
 */
export const useFilterUrlSync = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const hydrateFromUrl = useFilterStore((state) => state.hydrateFromUrl)

  const seeded = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Held in a ref so the subscription below never has to re-subscribe when the query
  // string changes — re-subscribing mid-debounce would drop the pending write.
  const currentQuery = useRef('')

  currentQuery.current = searchParams.toString()

  // URL -> store. Re-runs when the query string changes underneath us.
  useEffect(() => {
    hydrateFromUrl(new URLSearchParams(searchParams.toString()))
    seeded.current = true
  }, [searchParams, hydrateFromUrl])

  // store -> URL, debounced. One subscription for the lifetime of the component.
  useEffect(() => {
    const unsubscribe = useFilterStore.subscribe((state: FilterState) => {
      if (!seeded.current) return

      const query = filtersToSearchParams(state).toString()
      // Nothing changed — usually the echo of our own hydrate. Do not navigate.
      if (query === currentQuery.current) return

      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
      }, DEBOUNCE_MS)
    })

    return () => {
      unsubscribe()
      if (timer.current) clearTimeout(timer.current)
    }
  }, [router, pathname])
}
