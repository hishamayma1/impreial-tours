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
}

const selectClass =
  'rounded-lg border border-hairline bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'

/**
 * Filter controls. These write to the store; `useFilterUrlSync` debounces that into
 * the URL, and the server page re-renders from `searchParams`. The store never renders
 * results itself — the URL is the source of truth.
 */
export const ListingFilters = ({ variant }: ListingFiltersProps) => {
  const t = useTranslations('services')
  const filters = useTranslations('filters')

  useFilterUrlSync()

  const { difficulty, starRating, sortBy, minPrice, maxPrice } = useFilterStore(
    useShallow((state) => ({
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
    Boolean(difficulty) || starRating !== null || minPrice !== null || maxPrice !== null

  return (
    <div className="border-b border-hairline bg-surface-container-low">
      <Container className="flex flex-wrap items-end gap-4 py-6">
        {variant === 'tours' ? (
          <label className="flex flex-col gap-1.5">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
              {t('difficultyLabel')}
            </span>
            <select
              value={difficulty}
              onChange={(event) => set({ difficulty: event.target.value })}
              className={selectClass}
            >
              <option value="">{filters('any')}</option>
              <option value="easy">{t('difficulty.easy')}</option>
              <option value="moderate">{t('difficulty.moderate')}</option>
              <option value="hard">{t('difficulty.hard')}</option>
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
              {filters('stars')}
            </span>
            <select
              value={starRating ?? ''}
              onChange={(event) =>
                set({ starRating: event.target.value ? Number(event.target.value) : null })
              }
              className={selectClass}
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
          <span className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
            {filters('maxPrice')}
          </span>
          <input
            type="number"
            min={0}
            step={50}
            value={maxPrice ?? ''}
            onChange={(event) =>
              set({ maxPrice: event.target.value ? Number(event.target.value) : null })
            }
            className={`${selectClass} w-32`}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
            {filters('sortBy')}
          </span>
          <select
            value={sortBy}
            onChange={(event) => set({ sortBy: event.target.value })}
            className={selectClass}
          >
            <option value="newest">{filters('newest')}</option>
            <option value="priceAsc">{filters('priceAsc')}</option>
            <option value="priceDesc">{filters('priceDesc')}</option>
            <option value="ratingDesc">{filters('ratingDesc')}</option>
          </select>
        </label>

        {hasFilters ? (
          <Button type="button" variant="ghost" onClick={reset}>
            {filters('clear')}
          </Button>
        ) : null}
      </Container>
    </div>
  )
}
