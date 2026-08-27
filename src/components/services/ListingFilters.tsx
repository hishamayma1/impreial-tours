'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'

import { Container } from '@/components/ui/Container'
import { Icon, type IconName } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'
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
const CONTROL_H = 'h-11'

const labelClass =
  'font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant'

const shellClass =
  'rounded-xl border border-hairline bg-surface-container-lowest transition-colors duration-200 hover:border-brand/40'

/**
 * A select that looks like the rest of the design system rather than like the host OS.
 *
 * `appearance-none` strips the platform widget — which ignores every font, radius and
 * colour token the site defines — and the chevron is drawn back in. Padding leaves
 * room for both the leading icon and that chevron so long option text never slides
 * underneath either.
 */
const SelectControl = ({
  label,
  icon,
  value,
  onChange,
  children,
  className,
}: {
  label: string
  icon: IconName
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  className?: string
}) => (
  <label className={cn('flex min-w-0 flex-col gap-1.5', className)}>
    <span className={labelClass}>{label}</span>
    <div className="relative">
      <Icon
        name={icon}
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
      />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'focus-card w-full appearance-none pl-10 pr-9 font-body-md text-body-md text-primary',
          CONTROL_H,
          shellClass,
        )}
      >
        {children}
      </select>
      <Icon
        name="chevron-down"
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
      />
    </div>
  </label>
)

/**
 * Difficulty and star rating are three or four mutually exclusive choices, so they are
 * shown as a segmented control rather than a select: every option is legible without
 * opening anything, and choosing one costs a single tap instead of tap-scroll-tap.
 */
const Segmented = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
}) => (
  <div className="flex flex-col gap-1.5">
    <span className={labelClass} id={`seg-${label}`}>
      {label}
    </span>
    <div
      role="group"
      aria-labelledby={`seg-${label}`}
      className={cn('inline-flex items-center gap-1 p-1', CONTROL_H, shellClass)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            // `aria-pressed` rather than `aria-selected`: these are toggle buttons in a
            // group, not options in a listbox, and only the former is valid on <button>.
            aria-pressed={active}
            className={cn(
              'focus-card h-9 whitespace-nowrap rounded-lg px-3 font-body-md text-body-md transition-colors duration-200',
              active
                ? 'bg-brand text-on-primary'
                : 'text-on-surface-variant hover:bg-brand/5 hover:text-brand',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  </div>
)

/** A removable summary of one active filter. */
const Chip = ({
  label,
  removeLabel,
  onRemove,
}: {
  label: string
  removeLabel: string
  onRemove: () => void
}) => (
  <button
    type="button"
    onClick={onRemove}
    aria-label={removeLabel}
    className="focus-card inline-flex h-8 items-center gap-1.5 rounded-full border border-brand/25 bg-brand/5 py-0 pl-3 pr-2.5 font-body-md text-caption text-brand transition-colors duration-200 hover:border-brand hover:bg-brand hover:text-on-primary"
  >
    {label}
    <Icon name="close" className="h-3.5 w-3.5" aria-hidden />
  </button>
)

/**
 * Filter controls. These write to the store; `useFilterUrlSync` debounces that into
 * the URL, and the server page re-renders from `searchParams`. The store never renders
 * results itself — the URL is the source of truth.
 *
 * Three things the row is built around:
 *
 *  - Every control is one 44px band tall and bottom-aligned, so the row reads as a
 *    single strip rather than a set of unrelated boxes at different heights.
 *  - Sort is separated from the filters by the flex gap, because it does something
 *    different: filters change *which* results exist, sort only reorders them.
 *  - What is currently applied is stated in words underneath as removable chips.
 *    Without that, a visitor arriving on a filtered link — which is the whole point of
 *    keeping filters in the URL — has to read four controls to work out why they are
 *    seeing six results instead of forty.
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

  // Collapsed by default on phones, where four controls stacked would push the first
  // result below the fold. Irrelevant from `md` up, where the row always shows.
  const [open, setOpen] = useState(false)

  /**
   * Sort is deliberately left alone: it is a display preference, not a filter, and
   * clearing a search should not also throw away "price: low to high".
   */
  const clearAll = () =>
    set({ destination: '', difficulty: '', starRating: null, minPrice: null, maxPrice: null })

  const active: Array<{ key: string; label: string; clear: () => void }> = []

  if (destination) {
    const match = destinations.find((option) => option.slug === destination)
    active.push({
      key: 'destination',
      label: match?.name ?? destination,
      clear: () => set({ destination: '' }),
    })
  }
  if (difficulty) {
    active.push({
      key: 'difficulty',
      label: t(`difficulty.${difficulty}` as 'difficulty.easy'),
      clear: () => set({ difficulty: '' }),
    })
  }
  if (starRating !== null) {
    active.push({
      key: 'stars',
      label: filters('starsValue', { count: String(starRating) }),
      clear: () => set({ starRating: null }),
    })
  }
  if (minPrice !== null) {
    active.push({
      key: 'minPrice',
      label: filters('priceFrom', { value: String(minPrice) }),
      clear: () => set({ minPrice: null }),
    })
  }
  if (maxPrice !== null) {
    active.push({
      key: 'maxPrice',
      label: filters('priceUpTo', { value: String(maxPrice) }),
      clear: () => set({ maxPrice: null }),
    })
  }

  const priceInputClass =
    'w-16 bg-transparent font-body-md text-body-md text-primary placeholder:text-outline focus:outline-none'

  return (
    /**
     * Sticky under the header so filters stay reachable while scrolling a long list.
     * `top-20` clears the 5rem header; the backdrop blur keeps the row legible over
     * content passing beneath it without hiding that content entirely.
     */
    <div className="sticky top-20 z-30 border-y border-hairline bg-surface-container-low/85 backdrop-blur-md">
      <Container className="py-4">
        {/* Phone-only disclosure. The count means the button reports state, not just posture. */}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={cn(
            'focus-card flex w-full items-center justify-between px-4 font-body-md text-body-md text-primary md:hidden',
            CONTROL_H,
            shellClass,
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="compass" className="h-4 w-4 text-outline" />
            {filters('title')}
            {active.length > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 font-body-md text-caption text-on-primary">
                {active.length}
              </span>
            ) : null}
          </span>
          <Icon
            name="chevron-down"
            className={cn('h-4 w-4 text-outline transition-transform duration-200', open && 'rotate-180')}
          />
        </button>

        <div
          className={cn(
            'flex-wrap items-end gap-x-4 gap-y-4 md:mt-0 md:flex',
            // `open` is only reachable from the phone-only toggle, but it survives a
            // resize past the breakpoint — `md:mt-0` stops that leaving a stray gap
            // above a row whose toggle is no longer on screen.
            open ? 'mt-4 flex' : 'hidden',
          )}
        >
          {destinations.length > 0 ? (
            <SelectControl
              label={filters('destination')}
              icon="pin"
              value={destination}
              onChange={(value) => set({ destination: value })}
              className="w-full sm:w-52"
            >
              <option value="">{filters('any')}</option>
              {destinations.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </SelectControl>
          ) : null}

          {variant === 'tours' ? (
            <Segmented
              label={t('difficultyLabel')}
              value={difficulty}
              onChange={(value) => set({ difficulty: value })}
              options={[
                { value: '', label: filters('any') },
                { value: 'easy', label: t('difficulty.easy') },
                { value: 'moderate', label: t('difficulty.moderate') },
                { value: 'hard', label: t('difficulty.hard') },
              ]}
            />
          ) : (
            <Segmented
              label={filters('stars')}
              value={starRating === null ? '' : String(starRating)}
              onChange={(value) => set({ starRating: value ? Number(value) : null })}
              options={[
                { value: '', label: filters('any') },
                { value: '3', label: '3★+' },
                { value: '4', label: '4★+' },
                { value: '5', label: '5★' },
              ]}
            />
          )}

          {/*
            Min and max share one shell so they read as a single range rather than two
            unrelated numbers. Prices are authored in USD and the query compares against
            that field, so the prefix names the currency outright — the switcher only
            changes how results are displayed, and a "50" here is 50 USD either way.
          */}
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>{filters('price')}</span>
            <div
              className={cn(
                'flex items-center gap-1.5 px-3.5 focus-within:border-brand',
                CONTROL_H,
                shellClass,
              )}
            >
              <span className="font-label-caps text-label-caps text-outline">USD</span>
              <input
                type="number"
                min={0}
                step={50}
                inputMode="numeric"
                aria-label={filters('minPrice')}
                placeholder={filters('from')}
                value={minPrice ?? ''}
                onChange={(event) =>
                  set({ minPrice: event.target.value ? Number(event.target.value) : null })
                }
                className={priceInputClass}
              />
              <span aria-hidden className="text-outline">
                –
              </span>
              <input
                type="number"
                min={0}
                step={50}
                inputMode="numeric"
                aria-label={filters('maxPrice')}
                placeholder={filters('to')}
                value={maxPrice ?? ''}
                onChange={(event) =>
                  set({ maxPrice: event.target.value ? Number(event.target.value) : null })
                }
                className={priceInputClass}
              />
            </div>
          </div>

          <SelectControl
            label={filters('sortBy')}
            icon="compass"
            value={sortBy}
            onChange={(value) => set({ sortBy: value })}
            className="w-full sm:w-56 md:ml-auto"
          >
            <option value="newest">{filters('newest')}</option>
            <option value="priceAsc">{filters('priceAsc')}</option>
            <option value="priceDesc">{filters('priceDesc')}</option>
            <option value="ratingDesc">{filters('ratingDesc')}</option>
          </SelectControl>
        </div>

        {active.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
            <span className={cn(labelClass, 'me-1')}>{filters('active')}</span>
            {active.map((item) => (
              <Chip
                key={item.key}
                label={item.label}
                removeLabel={filters('remove', { label: item.label })}
                onRemove={item.clear}
              />
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="focus-card ms-1 rounded-lg px-2 py-1 font-body-md text-caption text-on-surface-variant underline decoration-hairline underline-offset-4 transition-colors duration-200 hover:text-brand hover:decoration-brand"
            >
              {filters('clear')}
            </button>
          </div>
        ) : null}
      </Container>
    </div>
  )
}
