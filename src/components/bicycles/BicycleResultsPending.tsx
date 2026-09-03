'use client'

import { useBicycleStore } from '@/stores/bicycle-store'
import { cn } from '@/lib/utils'

/**
 * Dims the results grid for the window between a filter click and the new server
 * render committing.
 *
 * `BicycleResults` is a Server Component behind a `Suspense` keyed on the query, and
 * React deliberately keeps its previous output on screen while the new one streams in
 * — the right call for avoiding a flash of empty content, but with nothing else
 * marking the wait it reads as the filter having no effect (the count and cards you
 * are looking at really are the old ones for a beat). This is that marker: it does
 * not touch what is rendered, only how it looks while stale.
 */
export const BicycleResultsPending = ({ children }: { children: React.ReactNode }) => {
  const pending = useBicycleStore((state) => state.pending)

  return (
    <div
      aria-busy={pending}
      className={cn('transition-opacity duration-200', pending && 'pointer-events-none opacity-40')}
    >
      {children}
    </div>
  )
}
