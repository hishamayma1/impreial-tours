'use client'

import { useEffect, useId, useMemo, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Icon } from '@/components/ui/Icon'
import { usePresence } from '@/hooks/use-presence'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { TOUR_TYPES, useSearchStore, type SearchCriteria, type TourType } from '@/stores'

export type DestinationOption = { name: string; slug: string }

type SearchWidgetProps = {
  /** The CMS default, as an editor typed it — a destination's name or slug. */
  defaultDestination: string
  destinations: DestinationOption[]
}

type Translate = ReturnType<typeof useTranslations<'search'>>

const fieldShell =
  'w-full rounded-xl border border-outline-variant bg-transparent py-4 pl-12 pr-4 text-on-surface ' +
  'placeholder:text-outline focus:border-brand focus:ring-brand focus:outline-none'

/** Case- and accent-insensitive, so "aswan" finds "Aswān" and "cairo" finds "Cairo/Giza". */
const fold = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/**
 * The destination field: type to narrow the published destinations, then pick one.
 *
 * A picker rather than free text because the catalogue filters on a destination's
 * slug. Free text could only ever be matched loosely, and a near-miss such as
 * "Giza" against "Cairo/Giza" returned no tours at all. Every option here is one
 * the catalogue knows, so every search lands on real results.
 *
 * Built on the ARIA combobox pattern: focus stays in the input while the arrow keys
 * move the highlighted option, so it works the same with a keyboard, a screen reader
 * and a thumb. The list sits inline below `md`, inside the search sheet, where an
 * absolutely placed dropdown would be clipped by the sheet's own scrolling; from `md`
 * it floats over the page under the field.
 */
const DestinationCombobox = ({
  id,
  options,
  value,
  onChange,
  t,
}: {
  id: string
  options: DestinationOption[]
  value: string
  onChange: (slug: string) => void
  t: Translate
}) => {
  const listId = `${id}-list`
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const list = usePresence(open, 200)

  const selectedName = options.find((option) => option.slug === value)?.name ?? ''

  // "Anywhere" leads the list until the visitor starts typing, then only matches show.
  const items = useMemo<DestinationOption[]>(() => {
    const needle = fold(query)
    if (!needle) return [{ name: t('anyDestination'), slug: '' }, ...options]
    return options.filter((option) => fold(option.name).includes(needle))
  }, [options, query, t])

  /**
   * The typed filter is cleared as the list opens, not as it closes: the list stays on
   * screen while it animates out, and clearing it then would swap the matches for the
   * full list mid-exit — a visible jump.
   */
  const openList = () => {
    if (!open) {
      setQuery('')
      setActive(0)
    }
    setOpen(true)
  }

  const choose = (option: DestinationOption) => {
    onChange(option.slug)
    setOpen(false)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) return openList()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((index) => (index + step + items.length) % Math.max(items.length, 1))
    } else if (event.key === 'Enter' && open) {
      // Picks the highlighted option instead of submitting the form half-filled.
      event.preventDefault()
      if (items[active]) choose(items[active])
    } else if (event.key === 'Escape' && open) {
      // Stops here so the Escape does not also close the mobile search sheet.
      event.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <Icon
        name="pin"
        className="pointer-events-none absolute left-4 top-[29px] h-5 w-5 -translate-y-1/2 text-outline"
      />
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && items[active] ? `${listId}-${active}` : undefined}
        // While open the field is the filter; closed, it shows what was picked.
        value={open ? query : selectedName}
        placeholder={open ? selectedName || t('destinationPlaceholder') : t('anyDestination')}
        onFocus={openList}
        onClick={openList}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
        className={cn(fieldShell, 'pr-10')}
      />
      <Icon
        name="chevron-down"
        className={cn(
          'pointer-events-none absolute right-4 top-[29px] h-4 w-4 -translate-y-1/2 text-outline transition-transform duration-200 motion-reduce:transition-none',
          open && 'rotate-180',
        )}
      />

      {/*
        Animated in both directions. Below `md` the list is inline, so it grows open by
        its real height (the grid-rows trick) and the fields under it slide down with
        it rather than jumping. From `md` it floats, so it keeps its full height and
        instead fades and drops in from just under the field.
      */}
      {list.mounted ? (
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity,transform] duration-200 ease-out motion-reduce:transition-none',
            'md:absolute md:inset-x-0 md:top-full md:z-40 md:origin-top md:grid-rows-[1fr]',
            list.shown
              ? 'grid-rows-[1fr] opacity-100 md:translate-y-0 md:scale-100'
              : 'pointer-events-none grid-rows-[0fr] opacity-0 md:-translate-y-1.5 md:scale-[0.98]',
          )}
        >
          <div className="min-h-0 overflow-hidden md:overflow-visible">
            <ul
              id={listId}
              role="listbox"
              className="mt-2 max-h-60 overflow-y-auto overscroll-contain rounded-xl border border-outline-variant bg-surface py-1 shadow-widget"
            >
              {items.length === 0 ? (
                <li className="px-4 py-3 font-body-md text-caption text-on-surface-variant">
                  {t('noMatches')}
                </li>
              ) : (
                items.map((option, index) => (
                  <li
                    key={option.slug || 'any'}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={option.slug === value}
                    // mousedown, not click: a click fires after the input's blur has
                    // already closed the list, so the option would be gone before it
                    // could register. Preventing the default keeps focus in the input.
                    onMouseDown={(event) => {
                      event.preventDefault()
                      choose(option)
                    }}
                    onMouseEnter={() => setActive(index)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-3 px-4 py-3 font-body-md text-body-md text-on-surface',
                      index === active && 'bg-brand/[0.06]',
                      option.slug === '' && 'text-on-surface-variant',
                    )}
                  >
                    <span className="truncate">{option.name}</span>
                    {option.slug === value ? (
                      <Icon name="check" className="h-4 w-4 shrink-0 text-brand" />
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * The three fields and the submit button, shared between the desktop form (always on
 * screen, `md` and up) and the mobile popup dialog (opened from a compact trigger
 * below `md` — see `SearchWidget`). Identical markup either way; only the wrapper
 * around it differs.
 */
const SearchFields = ({
  ids,
  destinations,
  destination,
  travelDate,
  tourType,
  pending,
  setField,
  t,
}: {
  ids: string
  destinations: DestinationOption[]
  destination: string
  travelDate: string
  tourType: TourType
  pending: boolean
  setField: <K extends keyof SearchCriteria>(key: K, value: SearchCriteria[K]) => void
  t: Translate
}) => (
  <>
    <div className="w-full md:w-1/3">
      <label
        htmlFor={`${ids}-destination`}
        className="mb-2 block font-label-caps text-label-caps uppercase text-on-surface-variant"
      >
        {t('destination')}
      </label>
      <DestinationCombobox
        id={`${ids}-destination`}
        options={destinations}
        value={destination}
        onChange={(slug) => setField('destination', slug)}
        t={t}
      />
    </div>

    <div className="w-full md:w-1/4">
      <label
        htmlFor={`${ids}-date`}
        className="mb-2 block font-label-caps text-label-caps uppercase text-on-surface-variant"
      >
        {t('date')}
      </label>
      <div className="relative">
        <Icon name="calendar" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-outline" />
        <DatePicker
          id={`${ids}-date`}
          value={travelDate}
          onChange={(iso) => setField('travelDate', iso)}
          hideIcon
          className={cn(fieldShell, 'h-[58px]')}
        />
      </div>
    </div>

    <div className="w-full md:w-1/4">
      <label
        htmlFor={`${ids}-type`}
        className="mb-2 block font-label-caps text-label-caps uppercase text-on-surface-variant"
      >
        {t('tourType')}
      </label>
      <div className="relative">
        <Icon name="compass" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-outline" />
        <select
          id={`${ids}-type`}
          name="tourType"
          value={tourType}
          onChange={(event) => setField('tourType', event.target.value as TourType)}
          className={`${fieldShell} appearance-none pr-10`}
        >
          {TOUR_TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`types.${value}`)}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
        />
      </div>
    </div>

    <Button type="submit" size="lg" disabled={pending} className="h-[58px] w-full md:w-auto">
      <Icon name="search" className="h-5 w-5" />
      {t('submit')}
    </Button>
  </>
)

/**
 * The hero search. Criteria live in a Zustand store so they survive navigation, and
 * submitting opens the tours catalogue filtered to them: `/tours?destination=<slug>&type=…`.
 * Those are the catalogue's own URL filters, so the result is a real, shareable
 * listing that the visitor can keep narrowing from its filter rail.
 *
 * The travel date is kept in the store for the booking step; the catalogue has no
 * availability data to filter on, so it is not part of the query.
 *
 * Two presentations of the same form, split at `md`:
 *
 *  - `md` and up: the fields sit inline, in the row this widget has always rendered.
 *  - Below `md`: a compact single-row trigger opens the same fields in a bottom-sheet
 *    dialog — the familiar mobile search pattern (Airbnb, Booking.com), and short
 *    enough not to push into the Services band under the hero.
 */
export const SearchWidget = ({ defaultDestination, destinations }: SearchWidgetProps) => {
  const t = useTranslations('search')
  const router = useRouter()
  // Two instances of `SearchFields` are mounted at once — the desktop form is only
  // `hidden` below `md`, not unmounted, and the mobile dialog is only translated
  // off-screen while closed — so each needs its own id namespace. Sharing one would
  // put two elements with the same id in the DOM, which breaks every `label htmlFor`
  // pointing at the second one.
  const desktopIds = useId()
  const mobileIds = useId()
  const dialogId = useId()

  const storedDestination = useSearchStore((state) => state.destination)
  const travelDate = useSearchStore((state) => state.travelDate)
  const storedType = useSearchStore((state) => state.tourType)
  const setField = useSearchStore((state) => state.setField)
  const applyDefaults = useSearchStore((state) => state.applyDefaults)

  // A slug from an earlier visit may belong to a destination since unpublished, and a
  // type may predate the current list; either falls back to "any" rather than
  // producing a search that silently matches nothing.
  const destination = destinations.some((option) => option.slug === storedDestination)
    ? storedDestination
    : ''
  const tourType: TourType = (TOUR_TYPES as readonly string[]).includes(storedType) ? storedType : 'any'

  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // The CMS default is free text, so it is matched to a destination by name or slug —
  // whole, or any part of a compound like "Cairo/Giza" (which picks Cairo). One that
  // names nothing published simply leaves the field on "anywhere".
  useEffect(() => {
    const parts = [fold(defaultDestination), ...fold(defaultDestination).split(/\s*[/,&|]\s*/)]
      .filter(Boolean)
    const match = destinations.find(
      (option) => parts.includes(fold(option.name)) || parts.includes(option.slug),
    )
    if (match) applyDefaults({ destination: match.slug })
  }, [applyDefaults, defaultDestination, destinations])

  // Lock the page under the dialog and let Escape close it, same contract as MobileNav.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query: Record<string, string> = {}
    if (destination) query.destination = destination
    if (tourType !== 'any') query.type = tourType

    setOpen(false)
    startTransition(() => router.push({ pathname: '/tours', query }))
  }

  const destinationName =
    destinations.find((option) => option.slug === destination)?.name ?? t('anyDestination')

  const fieldsProps = { destinations, destination, travelDate, tourType, pending, setField, t }

  return (
    <>
      {/* --- md and up: the form inline, as before ----------------------------- */}
      <form
        onSubmit={onSubmit}
        className="mx-auto hidden max-w-5xl items-end gap-4 rounded-2xl bg-surface p-8 shadow-widget md:flex"
      >
        <SearchFields ids={desktopIds} {...fieldsProps} />
      </form>

      {/* --- below md: a compact trigger, opening the same fields in a dialog -- */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-controls={dialogId}
        className="mx-auto flex w-full max-w-5xl items-center gap-3 rounded-2xl bg-surface p-4 text-start shadow-widget md:hidden"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/[0.07] text-brand">
          <Icon name="search" className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
            {t('destination')}
          </span>
          <span className="block truncate font-body-md text-body-md text-primary">
            {destinationName}
            {tourType !== 'any' ? (
              <span className="text-on-surface-variant"> · {t(`types.${tourType}`)}</span>
            ) : null}
          </span>
        </span>
        <span className="shrink-0 font-body-md text-body-md font-medium text-brand">
          {t('open')}
        </span>
      </button>

      {mounted
        ? createPortal(
            <>
              <span
                aria-hidden
                onClick={() => setOpen(false)}
                className={cn(
                  'fixed inset-0 z-[60] bg-primary/45 backdrop-blur-[2px] transition-opacity duration-300 md:hidden',
                  open ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
              />

              <div
                id={dialogId}
                role="dialog"
                aria-modal="true"
                aria-label={t('open')}
                inert={!open}
                className={cn(
                  'fixed inset-x-0 bottom-0 z-[60] max-h-[85vh] overflow-y-auto overscroll-contain',
                  'rounded-t-3xl bg-surface p-6 pb-8 shadow-2xl',
                  'transition-transform duration-300 ease-out md:hidden',
                  open ? 'translate-y-0' : 'translate-y-full',
                )}
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="font-headline-card text-headline-card text-primary">
                    {t('open')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t('close')}
                    className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <Icon name="close" />
                  </button>
                </div>

                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                  <SearchFields ids={mobileIds} {...fieldsProps} />
                </form>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}
