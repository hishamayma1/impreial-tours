'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'

import { Icon, type IconName } from '@/components/ui/Icon'
import { useBicycleUrlSync } from '@/hooks/use-filter-url-sync'
import { cn } from '@/lib/utils'
import { useBicycleStore, countActiveBicycleFilters } from '@/stores/bicycle-store'

export type BicycleFiltersProps = {
  destinations: Array<{ name: string; slug: string }>
  /** Real bounds from the listing, so the price inputs suggest prices that exist. */
  priceRange: { min: number; max: number }
  /** Result counts per kind, under every *other* active filter. */
  counts: { all: number; rental: number; tour: number }
}

const CATEGORIES = ['city', 'electric', 'mountain', 'road', 'touring', 'kids'] as const
const WINDOWS = ['hour', 'halfDay', 'fullDay', 'multiDay'] as const
const DIFFICULTIES = ['easy', 'moderate', 'hard'] as const
const FRAME_SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const

const CATEGORY_ICON: Record<(typeof CATEGORIES)[number], IconName> = {
  city: 'bike',
  electric: 'bolt',
  mountain: 'mountain',
  road: 'gauge',
  touring: 'compass',
  kids: 'users',
}

/** 44px is the smallest comfortable touch target; every control here shares it. */
const CONTROL_H = 'h-11'

const groupLabel =
  'font-label-caps text-label-caps uppercase tracking-[0.14em] text-on-surface-variant'

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * One filter group, as a native `<details>`: collapsible without a line of JavaScript
 * or a scrap of state. The disclosure triangle is suppressed and redrawn as a chevron
 * so it matches the rest of the system.
 */
const Group = ({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) => (
  <details open={defaultOpen} className="group/dl border-t border-hairline/70 py-5 first:border-t-0">
    <summary className="focus-card flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg [&::-webkit-details-marker]:hidden">
      <span className={groupLabel}>{title}</span>
      <Icon
        name="chevron-down"
        className="h-4 w-4 shrink-0 text-outline transition-transform duration-200 group-open/dl:rotate-180"
      />
    </summary>
    <div className="pt-4">{children}</div>
  </details>
)

/** A multi- or single-choice pill. Both share one look so the rail reads as one thing. */
const Pill = ({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      'focus-card inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 font-body-md text-caption transition-colors duration-200',
      active
        ? 'border-brand bg-brand text-on-primary'
        : 'border-hairline text-on-surface-variant hover:border-brand/50 hover:text-brand',
      className,
    )}
  >
    {children}
  </button>
)

// ---------------------------------------------------------------------------
// Rail
// ---------------------------------------------------------------------------

/**
 * The `/bicycles` filter rail.
 *
 * One component serves both placements: a left column from `lg` up, and a bottom sheet
 * below it. The alternative — a desktop rail plus a separate mobile dialog — ships the
 * same controls twice, doubles the surface where the two can disagree, and doubles the
 * JavaScript on a page whose whole point is that it loads fast.
 *
 * Controls write to the store; `useBicycleUrlSync` debounces that into the URL and the
 * server page re-renders from `searchParams`. The store never renders results itself:
 * the URL is the source of truth, so a filtered listing stays server-rendered,
 * shareable and crawlable.
 */
export const BicycleFilters = ({ destinations, priceRange, counts }: BicycleFiltersProps) => {
  const t = useTranslations('bicycles')
  const f = useTranslations('filters')
  const s = useTranslations('services')

  useBicycleUrlSync()

  const state = useBicycleStore(
    useShallow((store) => ({
      q: store.q,
      bikeType: store.bikeType,
      category: store.category,
      destination: store.destination,
      difficulty: store.difficulty,
      frameSizes: store.frameSizes,
      window: store.window,
      electric: store.electric,
      minPrice: store.minPrice,
      maxPrice: store.maxPrice,
    })),
  )
  const set = useBicycleStore((store) => store.set)
  const toggle = useBicycleStore((store) => store.toggle)
  const reset = useBicycleStore((store) => store.reset)
  const activeCount = useBicycleStore(countActiveBicycleFilters)

  const [open, setOpen] = useState(false)
  const panelId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  /**
   * Sheet behaviour, below `lg` only: lock the page behind it, close on Escape, and
   * move focus onto the sheet so a keyboard user is not left tabbing through the
   * results underneath.
   */
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    closeRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const numberInput =
    'w-full min-w-0 bg-transparent font-body-md text-body-md text-primary placeholder:text-outline focus:outline-none'

  const typeOptions = [
    { value: '', label: t('typeAll'), count: counts.all },
    { value: 'rental', label: t('typeRentalPlural'), count: counts.rental },
    { value: 'tour', label: t('typeRidePlural'), count: counts.tour },
  ]

  /**
   * The rental facets only describe rentals, so they are hidden while the guided-ride
   * tab is selected. Leaving them on screen would offer controls that provably cannot
   * change the result set — a ride has no frame sizes and no hourly window.
   */
  const showRentalFacets = state.bikeType !== 'tour'
  const showRideFacets = state.bikeType !== 'rental'

  const panel = (
    <>
      {/* --- search ------------------------------------------------------- */}
      <div className="border-b border-hairline/70 pb-5">
        <label className="sr-only" htmlFor={`${panelId}-q`}>
          {t('searchLabel')}
        </label>
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-xl border border-hairline bg-surface-container-lowest px-3.5 transition-colors duration-200 focus-within:border-brand',
            CONTROL_H,
          )}
        >
          <Icon name="search" className="h-4 w-4 shrink-0 text-outline" />
          <input
            id={`${panelId}-q`}
            type="search"
            value={state.q}
            onChange={(event) => set({ q: event.target.value })}
            placeholder={t('searchPlaceholder')}
            // The browser's own clear affordance is suppressed by the reset below so
            // the button beside it is the only one.
            className={cn(numberInput, '[&::-webkit-search-cancel-button]:appearance-none')}
          />
          {state.q ? (
            <button
              type="button"
              onClick={() => set({ q: '' })}
              aria-label={t('clearSearch')}
              className="focus-card -me-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-outline transition-colors duration-200 hover:bg-surface-container hover:text-brand"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* --- rent or ride --------------------------------------------------- */}
      <Group title={t('typeLabel')}>
        <div role="group" aria-label={t('typeLabel')} className="flex flex-col gap-1">
          {typeOptions.map((option) => {
            const active = option.value === state.bikeType
            return (
              <button
                key={option.value || 'all'}
                type="button"
                onClick={() => set({ bikeType: option.value })}
                aria-pressed={active}
                className={cn(
                  'focus-card flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-start font-body-md text-body-md transition-colors duration-200',
                  active
                    ? 'bg-brand text-on-primary'
                    : 'text-on-surface-variant hover:bg-brand/[0.06] hover:text-brand',
                )}
              >
                <span>{option.label}</span>
                {/*
                  The count is what makes these tabs honest: it reports what the tab
                  would show if pressed, so nobody clicks through to an empty page to
                  discover their combination matches nothing there.
                */}
                <span
                  className={cn(
                    'font-body-md text-caption tabular-nums',
                    active ? 'text-on-primary/70' : 'text-outline',
                  )}
                >
                  {option.count}
                </span>
              </button>
            )
          })}
        </div>
      </Group>

      {/* --- how long ------------------------------------------------------- */}
      {showRentalFacets ? (
        <Group title={t('windowLabel')}>
          {/*
            The listing's answer to the feature the detail page is built around. It is
            matched against each bike's own min/max hours, so it narrows to the bikes
            that will genuinely rent for that long rather than to a guess.
          */}
          <div role="group" aria-label={t('windowLabel')} className="flex flex-wrap gap-2">
            {WINDOWS.map((window) => (
              <Pill
                key={window}
                active={state.window === window}
                onClick={() => set({ window: state.window === window ? '' : window })}
              >
                {t(`window.${window}` as 'window.hour')}
              </Pill>
            ))}
          </div>
          <p className="mt-2.5 font-body-md text-caption text-on-surface-variant">
            {t('windowHint')}
          </p>
        </Group>
      ) : null}

      {/* --- category ------------------------------------------------------- */}
      <Group title={t('categoryLabel')}>
        <div role="group" aria-label={t('categoryLabel')} className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Pill
              key={category}
              active={state.category.includes(category)}
              onClick={() => toggle('category', category)}
            >
              <Icon name={CATEGORY_ICON[category]} className="h-3.5 w-3.5" />
              {t(`category.${category}` as 'category.city')}
            </Pill>
          ))}
        </div>
      </Group>

      {/* --- pedal assist --------------------------------------------------- */}
      {showRentalFacets ? (
        <Group title={t('assistLabel')}>
          {/*
            A single checkbox rather than a two-way choice. "Not electric" is not
            something anyone sets out to require, so offering it would add a control
            whose only job is to be left alone.
          */}
          <label className="group/row -mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-brand/[0.04]">
            <input
              type="checkbox"
              checked={state.electric}
              onChange={() => set({ electric: !state.electric })}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={cn(
                'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors duration-150',
                'border-outline-variant bg-surface-container-lowest',
                'peer-checked:border-brand peer-checked:bg-brand',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
                // The tick is a descendant, and `peer-checked:` only reaches siblings
                // of the peer — so the state is applied to the box and reaches down.
                '[&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100',
              )}
            >
              <Icon name="check" className="h-3 w-3 text-on-primary transition-opacity duration-150" />
            </span>
            <span className="font-body-md text-body-md text-primary">{t('electricOnly')}</span>
          </label>
        </Group>
      ) : null}

      {/* --- destination ---------------------------------------------------- */}
      {destinations.length ? (
        <Group title={f('destination')}>
          <div className="relative">
            <Icon
              name="pin"
              className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
            />
            <select
              aria-label={f('destination')}
              value={state.destination}
              onChange={(event) => set({ destination: event.target.value })}
              // `appearance-none` strips the platform widget, which honours none of the
              // site's fonts, radii or colours; the chevron is drawn back in below.
              className={cn(
                'focus-card w-full appearance-none rounded-xl border border-hairline bg-surface-container-lowest pe-9 ps-10 font-body-md text-body-md text-primary transition-colors duration-200 hover:border-brand/40',
                CONTROL_H,
              )}
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
          </div>
        </Group>
      ) : null}

      {/* --- price ---------------------------------------------------------- */}
      <Group title={f('price')}>
        {/*
          Two numbers rather than a slider: a slider needs a pointer, a drag and a
          re-render per frame to express what two taps on a keypad express exactly.
          Prices are authored in USD and the query compares against that field, so the
          prefix names the currency outright — the switcher changes how results are
          displayed, and a 20 here is 20 USD either way.
        */}
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border border-hairline bg-surface-container-lowest px-3.5 transition-colors duration-200 focus-within:border-brand',
            CONTROL_H,
          )}
        >
          <span className="shrink-0 font-label-caps text-label-caps text-outline">USD</span>
          <input
            type="number"
            min={0}
            step={5}
            inputMode="numeric"
            aria-label={f('minPrice')}
            placeholder={String(priceRange.min || 0)}
            value={state.minPrice ?? ''}
            onChange={(event) =>
              set({ minPrice: event.target.value ? Number(event.target.value) : null })
            }
            className={numberInput}
          />
          <span aria-hidden className="shrink-0 text-outline">
            –
          </span>
          <input
            type="number"
            min={0}
            step={5}
            inputMode="numeric"
            aria-label={f('maxPrice')}
            placeholder={String(priceRange.max || 0)}
            value={state.maxPrice ?? ''}
            onChange={(event) =>
              set({ maxPrice: event.target.value ? Number(event.target.value) : null })
            }
            className={numberInput}
          />
        </div>
        <p className="mt-2.5 font-body-md text-caption text-on-surface-variant">{t('priceHint')}</p>
      </Group>

      {/* --- frame size ----------------------------------------------------- */}
      {showRentalFacets ? (
        <Group title={t('frameSizes')} defaultOpen={false}>
          <div role="group" aria-label={t('frameSizes')} className="flex flex-wrap gap-2">
            {FRAME_SIZES.map((size) => (
              <Pill
                key={size}
                active={state.frameSizes.includes(size)}
                onClick={() => toggle('frameSizes', size)}
                className="min-w-11 justify-center"
              >
                {size}
              </Pill>
            ))}
          </div>
        </Group>
      ) : null}

      {/* --- difficulty ----------------------------------------------------- */}
      {showRideFacets ? (
        <Group title={s('difficultyLabel')} defaultOpen={false}>
          <div role="group" aria-label={s('difficultyLabel')} className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((level) => (
              <Pill
                key={level}
                active={state.difficulty.includes(level)}
                onClick={() => toggle('difficulty', level)}
              >
                {s(`difficulty.${level}` as 'difficulty.easy')}
              </Pill>
            ))}
          </div>
        </Group>
      ) : null}
    </>
  )

  const header = (
    <div className="flex items-center justify-between gap-3 pb-5">
      <h2 className="font-headline-card text-headline-card text-primary">{t('refine')}</h2>
      {activeCount > 0 ? (
        <button
          type="button"
          onClick={reset}
          className="focus-card rounded-lg px-2 py-1 font-body-md text-caption text-on-surface-variant underline decoration-hairline underline-offset-4 transition-colors duration-200 hover:text-brand hover:decoration-brand"
        >
          {f('clear')}
        </button>
      ) : null}
    </div>
  )

  return (
    <>
      {/*
        Mobile trigger. It reports the number of applied filters rather than merely its
        own open/closed posture, so a visitor arriving on a filtered link can see that
        something is narrowing the list without opening the sheet.
      */}
      <div className="-mx-6 mb-6 border-y border-hairline bg-surface-container-low/90 px-6 py-3 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls={panelId}
          className={cn(
            'focus-card flex w-full items-center justify-between rounded-xl border border-hairline bg-surface-container-lowest px-4 font-body-md text-body-md text-primary',
            CONTROL_H,
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="compass" className="h-4 w-4 text-outline" />
            {f('title')}
          </span>
          {activeCount > 0 ? (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-2 font-body-md text-caption text-on-primary">
              {activeCount}
            </span>
          ) : (
            <Icon name="chevron-down" className="h-4 w-4 -rotate-90 text-outline rtl:rotate-90" />
          )}
        </button>
      </div>

      {/* --- desktop rail --------------------------------------------------- */}
      <aside aria-label={t('refine')} className="hidden lg:block lg:pe-2">
        {header}
        {panel}
      </aside>

      {/* --- mobile sheet --------------------------------------------------- */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t('closeFilters')}
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-brand/40 backdrop-blur-[2px]"
          />
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label={t('refine')}
            className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-2xl border-t border-hairline bg-surface-container-lowest shadow-widget"
          >
            <div className="flex items-center justify-between gap-3 border-b border-hairline px-6 py-4">
              <h2 className="font-headline-card text-headline-card text-primary">{t('refine')}</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('closeFilters')}
                className="focus-card grid h-9 w-9 place-items-center rounded-full border border-hairline text-on-surface-variant transition-colors duration-200 hover:border-brand hover:text-brand"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
              {panel}
            </div>

            <div className="flex items-center gap-3 border-t border-hairline px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {activeCount > 0 ? (
                <button
                  type="button"
                  onClick={reset}
                  className={cn(
                    'focus-card rounded-xl border border-hairline px-5 font-body-md text-body-md text-on-surface-variant transition-colors duration-200 hover:border-brand hover:text-brand',
                    CONTROL_H,
                  )}
                >
                  {f('clear')}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={cn(
                  'focus-card flex-1 rounded-xl bg-brand px-5 font-body-md text-body-md text-on-primary transition-colors duration-200 hover:bg-brand-light',
                  CONTROL_H,
                )}
              >
                {t('showResults', { count: String(counts.all) })}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
