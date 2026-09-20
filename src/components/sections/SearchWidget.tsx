'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Icon } from '@/components/ui/Icon'
import { createBookingEnquiry } from '@/lib/actions/booking'
import { cn } from '@/lib/utils'
import {
  TOUR_TYPES,
  usePreferencesStore,
  useSearchStore,
  type SearchCriteria,
  type TourType,
} from '@/stores'

type SearchWidgetProps = {
  defaultDestination: string
}

const fieldShell =
  'w-full rounded-xl border border-outline-variant bg-transparent py-4 pl-12 pr-4 text-on-surface ' +
  'placeholder:text-outline focus:border-brand focus:ring-brand focus:outline-none'

/**
 * The three fields and the submit button, shared between the desktop form (always on
 * screen, `md` and up) and the mobile popup dialog (opened from a compact trigger
 * below `md` — see `SearchWidget`). Identical markup either way; only the wrapper
 * around it differs.
 */
const SearchFields = ({
  ids,
  destination,
  travelDate,
  tourType,
  pending,
  setField,
  t,
}: {
  ids: string
  destination: string
  travelDate: string
  tourType: TourType
  pending: boolean
  setField: <K extends keyof SearchCriteria>(key: K, value: SearchCriteria[K]) => void
  t: ReturnType<typeof useTranslations<'search'>>
}) => (
  <>
    <div className="w-full md:w-1/3">
      <label
        htmlFor={`${ids}-destination`}
        className="mb-2 block font-label-caps text-label-caps uppercase text-on-surface-variant"
      >
        {t('destination')}
      </label>
      <div className="relative">
        <Icon name="pin" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-outline" />
        <input
          id={`${ids}-destination`}
          name="destination"
          type="text"
          required
          value={destination}
          onChange={(event) => setField('destination', event.target.value)}
          placeholder={t('destinationPlaceholder')}
          className={fieldShell}
        />
      </div>
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
        <Icon name="anchor" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-outline" />
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
 * submission goes through a server action that writes a Booking enquiry.
 *
 * Two presentations of the same form, split at `md`:
 *
 *  - `md` and up: the fields sit inline, in the row this widget has always rendered.
 *  - Below `md`: three fields plus a button, each full width and stacked, made a form
 *    roughly 400px tall that overhung the Hero by half of that — enough to reach past
 *    Services' reserved padding and into its heading on a short phone. A compact
 *    single-row trigger stands in its place instead, opening the same fields in a
 *    popup dialog. That is also the more familiar mobile pattern for a search widget
 *    (Airbnb, Booking.com): a short summary pill you tap open, not a form that is
 *    always fully unfolded on screen.
 */
export const SearchWidget = ({ defaultDestination }: SearchWidgetProps) => {
  const t = useTranslations('search')
  const locale = useLocale()
  // Two instances of `SearchFields` are mounted at once — the desktop form is only
  // `hidden` below `md`, not unmounted, and the mobile dialog is only translated
  // off-screen while closed — so each needs its own id namespace. Sharing one would
  // put two elements with the same id in the DOM, which breaks every `label htmlFor`
  // pointing at the second one.
  const desktopIds = useId()
  const mobileIds = useId()
  const dialogId = useId()

  const destination = useSearchStore((state) => state.destination)
  const travelDate = useSearchStore((state) => state.travelDate)
  const tourType = useSearchStore((state) => state.tourType)
  const lastReference = useSearchStore((state) => state.lastReference)
  const setField = useSearchStore((state) => state.setField)
  const applyDefaults = useSearchStore((state) => state.applyDefaults)
  const setLastReference = useSearchStore((state) => state.setLastReference)
  const currency = usePreferencesStore((state) => state.currency)

  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    applyDefaults({ destination: defaultDestination })
  }, [applyDefaults, defaultDestination])

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
    startTransition(async () => {
      const result = await createBookingEnquiry({
        destination: destination || defaultDestination,
        travelDate,
        tourType,
        locale,
        currency,
      })
      setLastReference(result.ok ? result.reference : null)
    })
    setOpen(false)
  }

  const fieldsProps = { destination, travelDate, tourType, pending, setField, t }

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
            {destination || defaultDestination || t('destinationPlaceholder')}
          </span>
        </span>
        <span className="shrink-0 font-body-md text-body-md font-medium text-brand">
          {t('open')}
        </span>
      </button>

      <p aria-live="polite" className="sr-only">
        {lastReference ? t('resultsFor', { destination }) : ''}
      </p>

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
