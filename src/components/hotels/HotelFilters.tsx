'use client'

import { useEffect, useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'

import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { useStoreUrlSync } from '@/hooks/use-filter-url-sync'
import { cn } from '@/lib/utils'
import {
  useHotelStore,
  hotelsToSearchParams,
  countActiveHotelFilters,
  type HotelFilterState,
} from '@/stores/hotel-store'

type Props = {
  destinations: Array<{ name: string; slug: string }>
  amenities: readonly string[]
  priceRange: { min: number; max: number }
}

const STARS = [5, 4, 3] as const

const control =
  'h-12 rounded-xl border border-white/60 bg-surface-container-lowest/70 font-body-md text-body-md text-primary shadow-sm backdrop-blur-sm ' +
  'transition-[border-color,box-shadow] duration-200 focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25'

const label = 'mb-1.5 block font-label-caps text-label-caps uppercase tracking-[0.12em] text-on-surface-variant'

/**
 * The hotels listing filters, as a glass bar across the top rather than a left rail.
 *
 * Deliberately a different shape from the tours catalogue. A rail suits a catalogue
 * you browse down; a stay is chosen by narrowing on a few hard constraints — where,
 * how many stars, what it must have — and putting those across the top keeps the
 * hotels themselves at full width beneath, which is where the photography earns its
 * place. The ten amenities live behind a disclosure so the common case stays one row.
 *
 * Controls write to the store; `useStoreUrlSync` debounces that into the URL and the
 * server re-renders from `searchParams`. The URL is the source of truth throughout.
 */
export const HotelFilters = ({ destinations, amenities, priceRange }: Props) => {
  const t = useTranslations('hotels')
  const s = useTranslations('services')
  const f = useTranslations('filters')

  useStoreUrlSync<HotelFilterState>(useHotelStore, hotelsToSearchParams)

  const state = useHotelStore(
    useShallow((store) => ({
      q: store.q,
      destination: store.destination,
      stars: store.stars,
      amenities: store.amenities,
      minPrice: store.minPrice,
      maxPrice: store.maxPrice,
    })),
  )
  const set = useHotelStore((store) => store.set)
  const toggleAmenity = useHotelStore((store) => store.toggleAmenity)
  const reset = useHotelStore((store) => store.reset)
  const activeCount = useHotelStore(countActiveHotelFilters)

  const panelId = useId()
  const [open, setOpen] = useState(false)

  /**
   * Opens itself when the visitor arrives on a link that already uses one of the
   * hidden filters. Collapsed, a shared URL would show a narrowed list with no
   * on-screen explanation of what narrowed it.
   */
  useEffect(() => {
    if (state.amenities.length || state.minPrice !== null || state.maxPrice !== null) setOpen(true)
    // Only on mount: afterwards the disclosure is the visitor's to control, and
    // re-running would spring it back open every time they cleared an amenity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="border-y border-white/40 bg-surface-container-lowest/70 backdrop-blur-xl">
      <Container className="py-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* --- search ------------------------------------------------------ */}
          <label className="min-w-0 flex-1 basis-64">
            <span className={label}>{t('searchLabel')}</span>
            <span
              className={cn(
                'flex items-center gap-2.5 px-4 focus-within:border-brand/60 focus-within:ring-2 focus-within:ring-brand/25',
                control,
              )}
            >
              <Icon name="search" className="h-4 w-4 shrink-0 text-outline" />
              <input
                type="search"
                value={state.q}
                onChange={(event) => set({ q: event.target.value })}
                placeholder={t('searchPlaceholder')}
                className="w-full min-w-0 bg-transparent placeholder:text-outline focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
              />
            </span>
          </label>

          {/* --- destination -------------------------------------------------- */}
          {destinations.length ? (
            <label className="min-w-0 basis-52">
              <span className={label}>{f('destination')}</span>
              <span className="relative block">
                <Icon
                  name="pin"
                  className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
                />
                <select
                  value={state.destination}
                  onChange={(event) => set({ destination: event.target.value })}
                  className={cn(control, 'w-full appearance-none pe-9 ps-10')}
                >
                  <option value="">{f('any')}</option>
                  {destinations.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <Icon
                  name="chevron-down"
                  className="pointer-events-none absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
                />
              </span>
            </label>
          ) : null}

          {/* --- stars -------------------------------------------------------- */}
          <div>
            <span className={label} id={`${panelId}-stars`}>
              {f('stars')}
            </span>
            <div
              role="group"
              aria-labelledby={`${panelId}-stars`}
              className={cn('inline-flex items-center gap-1 p-1', control)}
            >
              {[{ value: '', text: f('any') }, ...STARS.map((n) => ({ value: String(n), text: `${n}★` }))].map(
                (option) => {
                  const active = option.value === state.stars
                  return (
                    <button
                      key={option.value || 'any'}
                      type="button"
                      onClick={() => set({ stars: option.value })}
                      aria-pressed={active}
                      className={cn(
                        'h-9 whitespace-nowrap rounded-lg px-3 font-body-md text-body-md transition-colors duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                        active
                          ? 'bg-brand text-on-primary'
                          : 'text-on-surface-variant hover:bg-brand/5 hover:text-brand',
                      )}
                    >
                      {option.text}
                    </button>
                  )
                },
              )}
            </div>
          </div>

          {/* --- more ---------------------------------------------------------- */}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={panelId}
            className={cn(
              control,
              'inline-flex items-center gap-2 px-4 hover:border-brand/40',
              open && 'border-brand/50 bg-brand/[0.05]',
            )}
          >
            <Icon name="compass" className="h-4 w-4 text-outline" />
            {t('moreFilters')}
            {activeCount > 0 ? (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-2 font-body-md text-caption text-on-primary">
                {activeCount}
              </span>
            ) : (
              <Icon
                name="chevron-down"
                className={cn('h-4 w-4 text-outline transition-transform duration-200', open && 'rotate-180')}
              />
            )}
          </button>

          {activeCount > 0 ? (
            <button
              type="button"
              onClick={reset}
              className="h-12 rounded-xl px-3 font-body-md text-caption text-on-surface-variant underline decoration-hairline underline-offset-4 transition-colors duration-200 hover:text-brand hover:decoration-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {f('clear')}
            </button>
          ) : null}
        </div>

        {/* --- disclosure: amenities and price -------------------------------- */}
        <div
          id={panelId}
          /**
           * Collapsed with a class, not the `hidden` attribute.
           *
           * `hidden` is a presentation hint of `display: none`, and any `display` in a
           * stylesheet beats it — so `grid` here left the panel permanently open and
           * the toggle doing nothing but rotating its chevron. Swapping the display
           * value itself is the only version that actually collapses.
           */
          className={cn(
            'mt-4 gap-6 border-t border-hairline pt-4 lg:grid-cols-[minmax(0,1fr)_auto]',
            open ? 'grid' : 'hidden',
          )}
        >
          <div>
            <span className={label}>{s('amenitiesTitle')}</span>
            <ul className="flex flex-wrap gap-2">
              {amenities.map((amenity) => {
                const active = state.amenities.includes(amenity)
                return (
                  <li key={amenity}>
                    <button
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      aria-pressed={active}
                      className={cn(
                        'h-9 rounded-full border px-3.5 font-body-md text-caption transition-[transform,background-color,border-color] duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
                        active
                          ? 'border-brand bg-brand text-on-primary'
                          : 'border-hairline bg-surface-container-lowest/60 text-on-surface-variant hover:border-brand/50 hover:text-brand motion-safe:hover:-translate-y-0.5',
                      )}
                    >
                      {s(`amenities.${amenity}` as 'amenities.wifi')}
                    </button>
                  </li>
                )
              })}
            </ul>
            {/*
              Amenities are combined with AND — every one ticked must be present — so
              the label says so. Left unsaid, a list that shrinks with each tick reads
              as the filter misbehaving.
            */}
            <p className="mt-2 font-body-md text-caption text-on-surface-variant">
              {t('amenitiesHint')}
            </p>
          </div>

          <div>
            <span className={label}>{f('price')}</span>
            <div className={cn('flex items-center gap-2 px-3.5', control)}>
              <span className="shrink-0 font-label-caps text-label-caps text-outline">USD</span>
              <input
                type="number"
                min={0}
                step={10}
                inputMode="numeric"
                aria-label={f('minPrice')}
                placeholder={String(priceRange.min || 0)}
                value={state.minPrice ?? ''}
                onChange={(event) =>
                  set({ minPrice: event.target.value ? Number(event.target.value) : null })
                }
                className="w-20 bg-transparent placeholder:text-outline focus:outline-none"
              />
              <span aria-hidden className="text-outline">
                –
              </span>
              <input
                type="number"
                min={0}
                step={10}
                inputMode="numeric"
                aria-label={f('maxPrice')}
                placeholder={String(priceRange.max || 0)}
                value={state.maxPrice ?? ''}
                onChange={(event) =>
                  set({ maxPrice: event.target.value ? Number(event.target.value) : null })
                }
                className="w-20 bg-transparent placeholder:text-outline focus:outline-none"
              />
            </div>
            <p className="mt-2 font-body-md text-caption text-on-surface-variant">
              {t('priceHint')}
            </p>
          </div>
        </div>
      </Container>
    </div>
  )
}
