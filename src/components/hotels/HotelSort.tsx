'use client'

import { useTranslations } from 'next-intl'

import { Icon } from '@/components/ui/Icon'
import { useHotelStore } from '@/stores/hotel-store'

/**
 * The listing's sort control.
 *
 * Kept beside the results rather than in the filter bar: sorting never removes a
 * hotel, it only reorders them, and grouping it with the filters invites a visitor to
 * read "price: low to high" as a constraint they have applied.
 *
 * The filter bar owns the single URL-sync subscription; this only writes to the shared
 * store. Two components each running their own sync would each fire a navigation.
 */
export const HotelSort = () => {
  const f = useTranslations('filters')
  const h = useTranslations('hotels')

  const sortBy = useHotelStore((state) => state.sortBy)
  const set = useHotelStore((state) => state.set)

  return (
    <label className="flex shrink-0 items-center gap-2.5">
      <span className="hidden font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant sm:inline">
        {f('sortBy')}
      </span>
      <span className="relative">
        <select
          value={sortBy}
          onChange={(event) => set({ sortBy: event.target.value })}
          aria-label={f('sortBy')}
          className="focus-card h-11 w-full appearance-none rounded-xl border border-white/60 bg-surface-container-lowest/70 pe-9 ps-4 font-body-md text-body-md text-primary shadow-sm backdrop-blur-sm transition-colors duration-200 hover:border-brand/40"
        >
          <option value="newest">{f('newest')}</option>
          <option value="priceAsc">{f('priceAsc')}</option>
          <option value="priceDesc">{f('priceDesc')}</option>
          <option value="ratingDesc">{h('sortStars')}</option>
          <option value="nameAsc">{f('titleAsc')}</option>
        </select>
        <Icon
          name="chevron-down"
          className="pointer-events-none absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
        />
      </span>
    </label>
  )
}
