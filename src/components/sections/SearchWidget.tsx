'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Icon, type IconName } from '@/components/ui/Icon'
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

/** Case- and accent-insensitive, for matching the CMS default against destination names. */
const fold = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/**
 * The floating option list both pickers share, and its open/close animation.
 *
 * Always an overlay, at every width. It used to sit inline in the phone sheet, where
 * opening it grew the bottom-anchored sheet upward and dragged the focused field
 * ~200px up the screen mid-tap — while the phone keyboard was sliding in and
 * scrolling to follow that same field. That combination is what made the list
 * open and immediately close on a real phone. Floating, it moves nothing.
 */
const listClass = (shown: boolean) =>
  cn(
    'absolute inset-x-0 top-full z-40 mt-2 max-h-60 origin-top overflow-y-auto overscroll-contain',
    'rounded-xl border border-outline-variant bg-surface py-1 shadow-widget',
    'transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none',
    shown
      ? 'translate-y-0 scale-100 opacity-100'
      : 'pointer-events-none -translate-y-1.5 scale-[0.98] opacity-0',
  )

const optionClass = (active: boolean) =>
  cn(
    'flex cursor-pointer items-center justify-between gap-3 px-4 py-3 font-body-md text-body-md text-on-surface',
    active && 'bg-brand/[0.06]',
  )

const Chevron = ({ open }: { open: boolean }) => (
  <Icon
    name="chevron-down"
    className={cn(
      'pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-outline transition-transform duration-200 motion-reduce:transition-none',
      open && 'rotate-180',
    )}
  />
)

type PickerOption<T extends string> = {
  value: T
  label: string
  /** Drawn in the secondary text colour — used for the "anywhere" catch-all. */
  muted?: boolean
}

/**
 * A choose-from-the-list field, used for both the destination and the tour type.
 *
 * A button that opens a list of fixed options — nothing to type. The destination was
 * a type-to-filter input, but every choice is one of a handful of published
 * destinations, and on a phone the input pulled up the keyboard for no gain: it
 * covered half the sheet and turned a single tap into a tap, a keyboard and a
 * dismissal. This is the ARIA select-only combobox pattern: the button keeps the
 * focus and the arrow keys move the highlighted option.
 *
 * Closed by an outside press rather than by blur: Safari on iOS does not focus a
 * button when it is tapped, so a blur-driven close would never fire there.
 */
const OptionPicker = <T extends string>({
  id,
  icon,
  options,
  value,
  onChange,
}: {
  id: string
  icon: IconName
  options: PickerOption<T>[]
  value: T
  onChange: (value: T) => void
}) => {
  const listId = `${id}-list`
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const list = usePresence(open, 200)

  const selectedIndex = Math.max(
    options.findIndex((option) => option.value === value),
    0,
  )

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const show = () => {
    setActive(selectedIndex)
    setOpen(true)
  }

  const choose = (option: PickerOption<T>) => {
    onChange(option.value)
    setOpen(false)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) return show()
      setActive((index) => Math.min(last, Math.max(0, index + (event.key === 'ArrowDown' ? 1 : -1))))
    } else if ((event.key === 'Home' || event.key === 'End') && open) {
      event.preventDefault()
      setActive(event.key === 'Home' ? 0 : last)
    } else if ((event.key === 'Enter' || event.key === ' ') && open) {
      // Picks the highlighted option instead of submitting the form half-filled.
      event.preventDefault()
      if (options[active]) choose(options[active])
    } else if (event.key === 'Escape' && open) {
      // Stops here so the Escape does not also close the mobile search sheet.
      event.stopPropagation()
      setOpen(false)
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Icon
          name={icon}
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-outline"
        />
        <button
          id={id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={onKeyDown}
          className={cn(fieldShell, 'h-[58px] truncate pr-10 text-start', open && 'border-brand')}
        >
          {options[selectedIndex]?.label}
        </button>
        <Chevron open={open} />
      </div>

      {list.mounted ? (
        <ul id={listId} role="listbox" className={listClass(list.shown)}>
          {options.map((option, index) => (
            <li
              key={option.value || 'any'}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              // Keeps the focus on the button, so the highlighted option and the
              // arrow keys stay in step after a pointer has been used.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              onMouseEnter={() => setActive(index)}
              className={cn(optionClass(index === active), option.muted && 'text-on-surface-variant')}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value ? (
                <Icon name="check" className="h-4 w-4 shrink-0 text-brand" />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * The three fields, shared between the desktop form (always on screen, `md` and up)
 * and the mobile sheet (opened from a compact trigger below `md` — see
 * `SearchWidget`). Identical markup either way; only the wrapper around it differs.
 */
const SearchFields = ({
  ids,
  destinations,
  destination,
  travelDate,
  tourType,
  setField,
  t,
}: {
  ids: string
  destinations: DestinationOption[]
  destination: string
  travelDate: string
  tourType: TourType
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
      <OptionPicker
        id={`${ids}-destination`}
        icon="pin"
        options={[
          { value: '', label: t('anyDestination'), muted: true },
          ...destinations.map((option) => ({ value: option.slug, label: option.name })),
        ]}
        value={destination}
        onChange={(slug) => setField('destination', slug)}
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
      <OptionPicker
        id={`${ids}-type`}
        icon="compass"
        options={TOUR_TYPES.map((type) => ({ value: type, label: t(`types.${type}`) }))}
        value={tourType}
        onChange={(type) => setField('tourType', type)}
      />
    </div>
  </>
)

const SubmitButton = ({ pending, label, className }: { pending: boolean; label: string; className?: string }) => (
  <Button type="submit" size="lg" disabled={pending} className={cn('h-[58px] w-full md:w-auto', className)}>
    <Icon name="search" className="h-5 w-5" />
    {label}
  </Button>
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
 *  - Below `md`: a compact single-row trigger opens the same fields in a tall sheet —
 *    the familiar mobile search pattern (Airbnb, Booking.com).
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

  const fieldsProps = { destinations, destination, travelDate, tourType, setField, t }

  return (
    <>
      {/* --- md and up: the form inline, as before ----------------------------- */}
      <form
        onSubmit={onSubmit}
        className="mx-auto hidden max-w-5xl items-end gap-4 rounded-2xl bg-surface p-8 shadow-widget md:flex"
      >
        <SearchFields ids={desktopIds} {...fieldsProps} />
        <SubmitButton pending={pending} label={t('submit')} />
      </form>

      {/* --- below md: a compact trigger, opening the same fields in a sheet --- */}
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

              {/*
                A fixed-height sheet with the fields at its top, not one sized to its
                content and anchored to the bottom of the screen. Content-sized, the
                sheet grew upward whenever anything in it grew, and the fields sat in
                the lower half of the screen — exactly where the phone keyboard opens
                over them. Here they sit high, above the keyboard, and never move; the
                Search button stays pinned at the foot.
              */}
              <div
                id={dialogId}
                role="dialog"
                aria-modal="true"
                aria-label={t('open')}
                inert={!open}
                className={cn(
                  'fixed inset-x-0 bottom-0 top-[max(4rem,env(safe-area-inset-top))] z-[60] flex flex-col',
                  'rounded-t-3xl bg-surface shadow-2xl',
                  'transition-transform duration-300 ease-out motion-reduce:transition-none md:hidden',
                  open ? 'translate-y-0' : 'translate-y-full',
                )}
              >
                <div className="flex shrink-0 items-center justify-between px-6 pb-2 pt-6">
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

                <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
                  {/* Bottom padding leaves room for a list opened from the last field. */}
                  <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 pb-56 pt-3">
                    <SearchFields ids={mobileIds} {...fieldsProps} />
                  </div>
                  <div className="shrink-0 border-t border-outline-variant/60 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
                    <SubmitButton pending={pending} label={t('submit')} />
                  </div>
                </form>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}
