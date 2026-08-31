'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'

import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'
import { useCatalogStore, countActiveCatalogFilters } from '@/stores/catalog-store'
import { useCatalogUrlSync } from '@/hooks/use-filter-url-sync'

type Option = { value: string; label: string; hint?: string }

export type CatalogSidebarProps = {
  destinations: Array<{ name: string; slug: string }>
  /** Real bounds from the catalogue, so the price presets are prices that exist. */
  priceRange: { min: number; max: number }
  /** Result counts per journey type, under every *other* active filter. */
  counts: { all: number; daily: number; experience: number }
}

const DIFFICULTIES = ['easy', 'moderate', 'hard'] as const
const LANGUAGES = ['en', 'es', 'de'] as const
const DURATIONS = ['halfDay', 'fullDay', 'shortBreak', 'week', 'extended'] as const
const RATINGS = [4.5, 4, 3] as const

/**
 * Endonyms, not translations: a Spanish speaker scanning a German page still
 * recognises "Español", where "Spanisch" only helps someone who already reads German.
 */
const LANGUAGE_LABELS: Record<'en' | 'es' | 'de', string> = {
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
}

/** 44px is the smallest comfortable touch target; every control here shares it. */
const CONTROL_H = 'h-11'

const groupLabel =
  'font-label-caps text-label-caps uppercase tracking-[0.14em] text-on-surface-variant'

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * One filter group.
 *
 * Rendered as a native `<details>`: open by default on every group that matters, and
 * collapsible without a line of JavaScript or a scrap of state. The disclosure
 * triangle is suppressed and redrawn as a chevron so it matches the rest of the
 * system, and `open:` variants animate it.
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

/**
 * A multi-select row.
 *
 * A real `<input type="checkbox">` carries the state — screen readers announce
 * "checked", the label is clickable, and the browser's own keyboard handling applies.
 * The box is drawn with `peer-checked:` rather than replaced by a div, so none of that
 * is given up for the visual.
 */
const CheckRow = ({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: () => void
}) => (
  <label className="group/row -mx-2 flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-brand/[0.04]">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="peer sr-only"
    />
    <span
      aria-hidden
      className={cn(
        'mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors duration-150',
        'border-outline-variant bg-surface-container-lowest',
        'peer-checked:border-brand peer-checked:bg-brand',
        'peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
        // The tick is a *descendant*, and `peer-checked:` only reaches siblings of the
        // peer — so the state is applied to the box and reaches down from there.
        '[&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100',
      )}
    >
      <Icon name="check" className="h-3 w-3 text-on-primary transition-opacity duration-150" />
    </span>
    <span className="min-w-0">
      <span className="block font-body-md text-body-md leading-snug text-primary">{label}</span>
      {hint ? (
        <span className="mt-0.5 block font-body-md text-caption text-on-surface-variant">
          {hint}
        </span>
      ) : null}
    </span>
  </label>
)

/** A single-choice pill row — pace, rating, collection. */
const PillGroup = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Option[]
  value: string
  onChange: (value: string) => void
}) => (
  <div role="group" aria-label={label} className="flex flex-wrap gap-2">
    {options.map((option) => {
      const active = option.value === value
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(active ? '' : option.value)}
          aria-pressed={active}
          className={cn(
            'focus-card h-9 rounded-full border px-3.5 font-body-md text-caption transition-colors duration-200',
            active
              ? 'border-brand bg-brand text-on-primary'
              : 'border-hairline text-on-surface-variant hover:border-brand/50 hover:text-brand',
          )}
        >
          {option.label}
        </button>
      )
    })}
  </div>
)

/** Multi-choice pills — languages, where several answers are legitimate at once. */
const TogglePills = ({
  label,
  options,
  values,
  onToggle,
}: {
  label: string
  options: Option[]
  values: string[]
  onToggle: (value: string) => void
}) => (
  <div role="group" aria-label={label} className="flex flex-wrap gap-2">
    {options.map((option) => {
      const active = values.includes(option.value)
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onToggle(option.value)}
          aria-pressed={active}
          className={cn(
            'focus-card h-9 rounded-full border px-3.5 font-body-md text-caption transition-colors duration-200',
            active
              ? 'border-brand bg-brand text-on-primary'
              : 'border-hairline text-on-surface-variant hover:border-brand/50 hover:text-brand',
          )}
        >
          {option.label}
        </button>
      )
    })}
  </div>
)

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

/**
 * The `/tours` filter rail.
 *
 * One component serves both placements: a left column from `lg` up, and a
 * bottom sheet below it. The alternative — a desktop rail plus a separate mobile
 * dialog — ships the same eleven controls twice, doubles the surface where the two
 * can disagree, and doubles the JavaScript for a page whose whole point is that it
 * loads fast.
 *
 * Controls write to the store; `useCatalogUrlSync` debounces that into the URL and the
 * server page re-renders from `searchParams`. The store never renders results itself:
 * the URL is the source of truth, so a filtered catalogue is server-rendered,
 * shareable and crawlable.
 */
export const CatalogSidebar = ({ destinations, priceRange, counts }: CatalogSidebarProps) => {
  const t = useTranslations('catalog')
  const s = useTranslations('services')

  useCatalogUrlSync()

  const state = useCatalogStore(
    useShallow((store) => ({
      q: store.q,
      type: store.type,
      destination: store.destination,
      difficulty: store.difficulty,
      languages: store.languages,
      duration: store.duration,
      badge: store.badge,
      minPrice: store.minPrice,
      maxPrice: store.maxPrice,
      minRating: store.minRating,
    })),
  )
  const set = useCatalogStore((store) => store.set)
  const toggle = useCatalogStore((store) => store.toggle)
  const reset = useCatalogStore((store) => store.reset)

  const activeCount = useCatalogStore(countActiveCatalogFilters)

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

  const typeOptions: Array<Option & { count: number }> = [
    { value: '', label: t('typeAll'), count: counts.all },
    { value: 'daily', label: t('typeDaily'), count: counts.daily },
    { value: 'experience', label: t('typeExperience'), count: counts.experience },
  ]

  const numberInput =
    'w-full min-w-0 bg-transparent font-body-md text-body-md text-primary placeholder:text-outline focus:outline-none'

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
            // the button beside it is the only one — two clear buttons on one field
            // is a bug report waiting to happen.
            className={cn(numberInput, '[&::-webkit-search-cancel-button]:appearance-none')}
          />
          {state.q ? (
            <button
              type="button"
              onClick={() => set({ q: '' })}
              aria-label={t('clearSearch')}
              className="focus-card -mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-outline transition-colors duration-200 hover:bg-surface-container hover:text-brand"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* --- journey type -------------------------------------------------- */}
      <Group title={t('typeLabel')}>
        <div role="group" aria-label={t('typeLabel')} className="flex flex-col gap-1">
          {typeOptions.map((option) => {
            const active = option.value === state.type
            return (
              <button
                key={option.value || 'all'}
                type="button"
                onClick={() => set({ type: option.value })}
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
                  would show if pressed, so a visitor never clicks through to an empty
                  page to find out their combination matches nothing there.
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

      {/* --- destination --------------------------------------------------- */}
      {destinations.length > 0 ? (
        <Group title={t('destination')}>
          <div className="relative">
            <Icon
              name="pin"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
            />
            <select
              aria-label={t('destination')}
              value={state.destination}
              onChange={(event) => set({ destination: event.target.value })}
              // `appearance-none` strips the platform widget, which ignores every
              // font, radius and colour token the site defines; the chevron is drawn
              // back in below.
              className={cn(
                'focus-card w-full appearance-none rounded-xl border border-hairline bg-surface-container-lowest pl-10 pr-9 font-body-md text-body-md text-primary transition-colors duration-200 hover:border-brand/40',
                CONTROL_H,
              )}
            >
              <option value="">{t('anyDestination')}</option>
              {destinations.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
            <Icon
              name="chevron-down"
              className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
            />
          </div>
        </Group>
      ) : null}

      {/* --- duration ------------------------------------------------------ */}
      <Group title={t('durationLabel')}>
        <div className="flex flex-col">
          {DURATIONS.map((band) => (
            <CheckRow
              key={band}
              label={t(`duration${band[0].toUpperCase()}${band.slice(1)}` as 'durationHalfDay')}
              hint={t(`duration${band[0].toUpperCase()}${band.slice(1)}Hint` as 'durationHalfDayHint')}
              checked={state.duration.includes(band)}
              onChange={() => toggle('duration', band)}
            />
          ))}
        </div>
      </Group>

      {/* --- price --------------------------------------------------------- */}
      <Group title={t('priceLabel')}>
        {/*
          Two numbers rather than a slider. A slider needs a pointer, a drag and a
          re-render per frame to express what two taps on a keypad express exactly —
          and on a catalogue this size the visitor usually has a figure in mind.
          Prices are authored in USD and the query compares against that field, so the
          prefix names the currency outright: the switcher changes how results are
          displayed, and a 50 here is 50 USD either way.
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
            step={50}
            inputMode="numeric"
            aria-label={`${t('priceLabel')} — ${priceRange.min}`}
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
            step={50}
            inputMode="numeric"
            aria-label={`${t('priceLabel')} — ${priceRange.max}`}
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

      {/* --- pace ---------------------------------------------------------- */}
      <Group title={t('paceLabel')}>
        <div role="group" aria-label={t('paceLabel')} className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((level) => {
            const active = state.difficulty.includes(level)
            return (
              <button
                key={level}
                type="button"
                onClick={() => toggle('difficulty', level)}
                aria-pressed={active}
                className={cn(
                  'focus-card h-9 rounded-full border px-3.5 font-body-md text-caption transition-colors duration-200',
                  active
                    ? 'border-brand bg-brand text-on-primary'
                    : 'border-hairline text-on-surface-variant hover:border-brand/50 hover:text-brand',
                )}
              >
                {s(`difficulty.${level}` as 'difficulty.easy')}
              </button>
            )
          })}
        </div>
      </Group>

      {/* --- rating -------------------------------------------------------- */}
      <Group title={t('ratingLabel')}>
        <PillGroup
          label={t('ratingLabel')}
          value={state.minRating === null ? '' : String(state.minRating)}
          onChange={(value) => set({ minRating: value ? Number(value) : null })}
          options={RATINGS.map((rating) => ({
            value: String(rating),
            label: `★ ${t('ratingValue', { count: String(rating) })}`,
          }))}
        />
      </Group>

      {/* --- guided in ----------------------------------------------------- */}
      <Group title={t('languageLabel')} defaultOpen={false}>
        <TogglePills
          label={t('languageLabel')}
          values={state.languages}
          onToggle={(value) => toggle('languages', value)}
          options={LANGUAGES.map((code) => ({
            value: code,
            label: LANGUAGE_LABELS[code],
          }))}
        />
      </Group>

      {/* --- collection ---------------------------------------------------- */}
      <Group title={t('collectionLabel')} defaultOpen={false}>
        <PillGroup
          label={t('collectionLabel')}
          value={state.badge}
          onChange={(value) => set({ badge: value })}
          options={[
            { value: 'bestseller', label: t('badgeBestseller') },
            { value: 'new', label: t('badgeNew') },
          ]}
        />
      </Group>
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
          {t('clearAll')}
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
            {t('filters')}
          </span>
          {activeCount > 0 ? (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-2 font-body-md text-caption text-on-primary">
              {activeCount}
            </span>
          ) : (
            <Icon name="chevron-down" className="h-4 w-4 -rotate-90 text-outline" />
          )}
        </button>
      </div>

      {/* --- desktop rail --------------------------------------------------- */}
      <aside
        aria-label={t('refine')}
        /**
         * A plain column that scrolls with the page.
         *
         * The height cap and private scrollport it used to carry only existed to make
         * a sticky rail usable — pinned in place, a rail taller than the viewport has
         * to scroll internally or its last groups are unreachable. Unpinned, both would
         * be actively harmful: they would trap a wheel gesture in a box that has no
         * reason to scroll separately from the page it now moves with.
         */
        className="hidden lg:block lg:pe-2"
      >
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">{panel}</div>

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
                  {t('clearAll')}
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
                {t('showResults')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
