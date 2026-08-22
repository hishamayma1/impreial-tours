'use client'

import { useEffect, useId, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { createBookingEnquiry } from '@/lib/actions/booking'
import { TOUR_TYPES, usePreferencesStore, useSearchStore, type TourType } from '@/stores'

type SearchWidgetProps = {
  defaultDestination: string
}

const fieldShell =
  'w-full rounded-xl border border-outline-variant bg-transparent py-4 pl-12 pr-4 text-on-surface ' +
  'placeholder:text-outline focus:border-brand focus:ring-brand focus:outline-none'

/**
 * The hero search. Criteria live in a Zustand store so they survive navigation, and
 * submission goes through a server action that writes a Booking enquiry.
 */
export const SearchWidget = ({ defaultDestination }: SearchWidgetProps) => {
  const t = useTranslations('search')
  const locale = useLocale()
  const ids = useId()

  const destination = useSearchStore((state) => state.destination)
  const travelDate = useSearchStore((state) => state.travelDate)
  const tourType = useSearchStore((state) => state.tourType)
  const lastReference = useSearchStore((state) => state.lastReference)
  const setField = useSearchStore((state) => state.setField)
  const applyDefaults = useSearchStore((state) => state.applyDefaults)
  const setLastReference = useSearchStore((state) => state.setLastReference)
  const currency = usePreferencesStore((state) => state.currency)

  const [pending, startTransition] = useTransition()

  useEffect(() => {
    applyDefaults({ destination: defaultDestination })
  }, [applyDefaults, defaultDestination])

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
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex max-w-5xl flex-col items-end gap-4 rounded-2xl bg-surface p-4 shadow-widget md:flex-row md:p-8"
    >
      <div className="w-full md:w-1/3">
        <label
          htmlFor={`${ids}-destination`}
          className="mb-2 block font-label-caps text-label-caps uppercase text-on-surface-variant"
        >
          {t('destination')}
        </label>
        <div className="relative">
          <Icon
            name="pin"
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-outline"
          />
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
          <Icon
            name="calendar"
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-outline"
          />
          <input
            id={`${ids}-date`}
            name="travelDate"
            type="date"
            value={travelDate}
            onChange={(event) => setField('travelDate', event.target.value)}
            className={fieldShell}
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
          <Icon
            name="anchor"
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-outline"
          />
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

      <p aria-live="polite" className="sr-only">
        {lastReference ? t('resultsFor', { destination }) : ''}
      </p>
    </form>
  )
}
