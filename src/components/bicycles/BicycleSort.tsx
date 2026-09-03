'use client'

import { useTranslations } from 'next-intl'

import { Icon } from '@/components/ui/Icon'
import { useBicycleStore } from '@/stores/bicycle-store'

/**
 * The listing's sort control.
 *
 * Kept apart from the filter rail because it belongs beside the results, not among the
 * filters: sorting never removes a bike from the list, it only reorders one, and
 * grouping the two invites a visitor to read "price: low to high" as a constraint they
 * have applied.
 *
 * It writes to the same store as the rail, and the rail owns the single URL-sync
 * subscription — two components each running their own sync would each fire a
 * navigation for one change.
 */
export const BicycleSort = () => {
  const t = useTranslations('filters')
  const b = useTranslations('bicycles')

  const sortBy = useBicycleStore((state) => state.sortBy)
  const set = useBicycleStore((state) => state.set)

  return (
    <label className="flex shrink-0 items-center gap-2.5">
      <span className="hidden font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant sm:inline">
        {t('sortBy')}
      </span>
      <span className="relative">
        <select
          value={sortBy}
          onChange={(event) => set({ sortBy: event.target.value })}
          aria-label={t('sortBy')}
          // `appearance-none` strips the platform widget, which honours none of the
          // site's fonts, radii or colours; the chevron is drawn back in beside it.
          className="focus-card h-11 w-full appearance-none rounded-xl border border-hairline bg-surface-container-lowest pe-9 ps-4 font-body-md text-body-md text-primary transition-colors duration-200 hover:border-brand/40"
        >
          <option value="newest">{t('newest')}</option>
          <option value="priceAsc">{t('priceAsc')}</option>
          <option value="priceDesc">{t('priceDesc')}</option>
          <option value="titleAsc">{b('sortTitleAsc')}</option>
        </select>
        <Icon
          name="chevron-down"
          className="pointer-events-none absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
        />
      </span>
    </label>
  )
}
