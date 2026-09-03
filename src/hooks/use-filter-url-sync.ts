'use client'

import { useEffect, useRef, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import type { StoreApi, UseBoundStore } from 'zustand'

import { useRouter, usePathname } from '@/i18n/navigation'
import { useFilterStore, filtersToSearchParams, type FilterState } from '@/stores/filter-store'
import {
  useCatalogStore,
  catalogToSearchParams,
  type CatalogFilterState,
} from '@/stores/catalog-store'
import {
  useBicycleStore,
  bicyclesToSearchParams,
  type BicycleFilterState,
} from '@/stores/bicycle-store'

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
 *
 * `onPendingChange`, when given, is told whether the replace triggered by this sync is
 * still in flight — the debounce plus the server re-render it kicks off. React (by
 * design) keeps the previous results on screen for that whole window rather than
 * blanking them, which is correct for avoiding flicker but reads as "the filter did
 * nothing" if nothing else marks the wait. Wiring the flag through `startTransition`
 * — rather than toggling it by hand around the `replace` call — is what makes it
 * track the *actual* render, not just the network request: it only clears once the
 * new RSC payload has streamed in and React has committed it.
 */
export const useStoreUrlSync = <S extends Syncable>(
  store: UseBoundStore<StoreApi<S>>,
  serialize: (state: S) => URLSearchParams,
  onPendingChange?: (pending: boolean) => void,
) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const hydrateFromUrl = store((state) => state.hydrateFromUrl)

  const onPendingChangeRef = useRef(onPendingChange)
  onPendingChangeRef.current = onPendingChange

  useEffect(() => {
    onPendingChangeRef.current?.(isPending)
  }, [isPending])

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
        startTransition(() => {
          router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
        })
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

/**
 * The `/bicycles` filter rail.
 *
 * Feeds `isPending` back into the store's own `pending` flag so a component outside
 * the rail — `BicycleResultsPending`, wrapping the results grid — can dim it for the
 * same window the rail already knows it is waiting through, without a second
 * subscription to this sync (only one may run per store: two would race two debounce
 * timers against the same URL).
 */
export const useBicycleUrlSync = () => {
  const setPending = useBicycleStore((state) => state.setPending)
  useStoreUrlSync<BicycleFilterState>(useBicycleStore, bicyclesToSearchParams, setPending)
}
