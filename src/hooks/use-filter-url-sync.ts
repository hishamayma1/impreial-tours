'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import type { StoreApi, UseBoundStore } from 'zustand'

import { useRouter, usePathname } from '@/i18n/navigation'
import { useFilterStore, filtersToSearchParams, type FilterState } from '@/stores/filter-store'
import {
  useCatalogStore,
  catalogToSearchParams,
  type CatalogFilterState,
} from '@/stores/catalog-store'

/** Long enough to swallow a burst of keystrokes, short enough to feel immediate. */
const DEBOUNCE_MS = 300

/** Any filter store that can seed itself from the query string. */
type Syncable = { hydrateFromUrl: (params: URLSearchParams) => void }

/**
 * Keeps a filter store and the URL in step, in both directions.
 *
 * On mount — and on a back/forward navigation — the URL seeds the store. Afterwards a
 * store change is written back to the URL on a debounce, so typing a search term
 * produces one navigation rather than one per keystroke.
 *
 * The write is a `replace`, not a `push`: filter tweaks should not each become a
 * history entry the visitor has to click back through to leave the page.
 *
 * Generic over the store because the two listings model their filters differently —
 * single-value facets on the service listings, multi-select on the `/tours`
 * catalogue — while the synchronisation itself is identical, and it is the part with
 * the ordering hazards worth having in exactly one place.
 */
export const useStoreUrlSync = <S extends Syncable>(
  store: UseBoundStore<StoreApi<S>>,
  serialize: (state: S) => URLSearchParams,
) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const hydrateFromUrl = store((state) => state.hydrateFromUrl)

  const seeded = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Held in a ref so the subscription below never has to re-subscribe when the query
  // string changes — re-subscribing mid-debounce would drop the pending write.
  const currentQuery = useRef('')
  // Same reasoning for the serializer: an inline arrow at the call site is a new
  // function on every render, and depending on it would tear the subscription down
  // and rebuild it on each one.
  const serializeRef = useRef(serialize)

  currentQuery.current = searchParams.toString()
  serializeRef.current = serialize

  // URL -> store. Re-runs when the query string changes underneath us.
  useEffect(() => {
    hydrateFromUrl(new URLSearchParams(searchParams.toString()))
    seeded.current = true
  }, [searchParams, hydrateFromUrl])

  // store -> URL, debounced. One subscription for the lifetime of the component.
  useEffect(() => {
    const unsubscribe = store.subscribe((state: S) => {
      if (!seeded.current) return

      const query = serializeRef.current(state).toString()
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
  }, [router, pathname, store])
}

/** The hotels / daily-tours / experiences filter bar. */
export const useFilterUrlSync = () =>
  useStoreUrlSync<FilterState>(useFilterStore, filtersToSearchParams)

/** The combined `/tours` catalogue sidebar. */
export const useCatalogUrlSync = () =>
  useStoreUrlSync<CatalogFilterState>(useCatalogStore, catalogToSearchParams)
