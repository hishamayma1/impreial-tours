'use client'

import { useTranslations } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'

import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { useFilterStore } from '@/stores'
import { useFilterUrlSync } from '@/hooks/use-filter-url-sync'

type ListingFiltersProps = {
  /** Which controls this listing needs — hotels filter by stars, tours by difficulty. */
  variant: 'tours' | 'hotels'
  /**
   * Every destination a record can be tagged with, resolved on the server.
   *
   * Passed in rather than fetched here: this is a client component, and the options
   * are identical for every visitor on the route, so paying for a client fetch would
   * buy nothing. An empty list hides the control entirely instead of rendering a
   * select with only "Any" in it.
   */
  destinations?: Array<{ name: string; slug: string }>
}

/**
 * Controls are 44px tall — the minimum comfortable touch target — and share one
 * height so the row aligns on a single baseline regardless of control type.
 */
const controlClass =
  'focus-card h-11 rounded-xl border border-hairline bg-surface-container-lowest px-3.5 font-body-md text-body-md text-primary transition-colors duration-200 hover:border-brand/40'

const labelClass =
  'font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant'

/**
 * Filter controls. These write to the store; `useFilterUrlSync` debounces that into
 * the URL, and the server page re-renders from `searchParams`. The store never renders
 * results itself — the URL is the source of truth.
 */
export const ListingFilters = ({ variant, destinations = [] }: ListingFiltersProps) => {
  const t = useTranslations('services')
  const filters = useTranslations('filters')

  useFilterUrlSync()

  const { destination, difficulty, starRating, sortBy, minPrice, maxPrice } = useFilterStore(
    useShallow((state) => ({
      destination: state.destination,
      difficulty: state.difficulty,
      starRating: state.starRating,
      sortBy: state.sortBy,
      minPrice: state.minPrice,
      maxPrice: state.maxPrice,
    })),
  )
  const set = useFilterStore((state) => state.set)
  const reset = useFilterStore((state) => state.reset)

  const hasFilters =
    Boolean(destination) ||
    Boolean(difficulty) ||
    starRating !== null ||
    minPrice !== null ||
    maxPrice !== null

  return (
    /**
     * Sticky under the header so filters stay reachable while scrolling a long list.
     * `top-20` clears the 5rem header; the backdrop blur keeps the row legible over
     * content passing beneath it without hiding that content entirely.
     */
    <div className="sticky top-20 z-30 border-y border-hairline bg-surface-container-low/85 backdrop-blur-md">
      <Container className="flex flex-wrap items-end gap-x-4 gap-y-3 py-4">
        {variant === 'tours' ? (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t('difficultyLabel')}</span>
            <select
              value={difficulty}
              onChange={(event) => set({ difficulty: event.target.value })}
              className={controlClass}
            >
              <option value="">{filters('any')}</option>
              <option value="easy">{t('difficulty.easy')}</option>
              <option value="moderate">{t('difficulty.moderate')}</option>
              <option value="hard">{t('difficulty.hard')}</option>
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{filters('stars')}</span>
            <select
              value={starRating ?? ''}
              onChange={(event) =>
                set({ starRating: event.target.value ? Number(event.target.value) : null })
              }
              className={controlClass}
            >
              <option value="">{filters('any')}</option>
              {[5, 4, 3].map((stars) => (
                <option key={stars} value={stars}>
                  {'★'.repeat(stars)}+
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{filters('maxPrice')}</span>
          <input
            type="number"
            min={0}
            step={50}
            inputMode="numeric"
            value={maxPrice ?? ''}
            onChange={(event) =>
              set({ maxPrice: event.target.value ? Number(event.target.value) : null })
            }
            className={`${controlClass} w-32`}
          />
        </label>

        <label className="ml-auto flex flex-col gap-1.5">
          <span className={labelClass}>{filters('sortBy')}</span>
          <select
            value={sortBy}
            onChange={(event) => set({ sortBy: event.target.value })}
            className={controlClass}
          >
            <option value="newest">{filters('newest')}</option>
            <option value="priceAsc">{filters('priceAsc')}</option>
            <option value="priceDesc">{filters('priceDesc')}</option>
            <option value="ratingDesc">{filters('ratingDesc')}</option>
          </select>
        </label>

        {hasFilters ? (
          <Button type="button" variant="ghost" onClick={reset} className="h-11 self-end">
            {filters('clear')}
          </Button>
        ) : null}
      </Container>
    </div>
  )
}
