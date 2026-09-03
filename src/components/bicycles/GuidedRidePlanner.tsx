'use client'

import { useId, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { DatePicker } from '@/components/ui/DatePicker'
import { Icon } from '@/components/ui/Icon'
import { Price } from '@/components/ui/Price'
import { useRouter } from '@/i18n/navigation'
import { addHoursToTime, formatISODate } from '@/lib/date'
import { cn } from '@/lib/utils'
import { formatPrice, usePreferencesStore, useBookingStore } from '@/stores'
import type { CurrencyVM } from '@/types/content'

export type GuidedRidePlannerProps = {
  id: string
  slug: string
  title: string
  image: string | null
  durationHours: number | null
  pricePerPerson: number | null
  startTimes: string[]
  guideIncluded: boolean
  bikeIncluded: boolean
  minAge: number | null
  maxGroupSize: number | null
  currencies: CurrencyVM[]
}

/**
 * The booking widget on a guided-ride's detail page.
 *
 * A guided ride is sold as a seat on a specific departure, not a duration you dial in
 * (that's the rental planner's job), so the two controls that matter here are *when*
 * and *how many riders* — everything else (route, distance, difficulty) is already on
 * the page. Once both are chosen, the "what's included" list grows the ride's date and
 * its start/end time alongside the guide/bike inclusions, so the visitor is looking at
 * exactly what they are about to reserve before they commit to it.
 */
export const GuidedRidePlanner = ({
  id,
  slug,
  title,
  image,
  durationHours,
  pricePerPerson,
  startTimes,
  guideIncluded,
  bikeIncluded,
  minAge,
  maxGroupSize,
  currencies,
}: GuidedRidePlannerProps) => {
  const t = useTranslations('bicycles')
  const s = useTranslations('services')
  const locale = useLocale()
  const router = useRouter()
  const panelId = useId()

  const currencyCode = usePreferencesStore((state) => state.currency)
  const setBicycleSelection = useBookingStore((state) => state.setBicycleSelection)
  const setService = useBookingStore((state) => state.setService)
  const setDates = useBookingStore((state) => state.setDates)

  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState(startTimes[0] ?? '')
  const [quantity, setQuantity] = useState(1)

  const endTime = useMemo(
    () => (startTime && durationHours ? addHoursToTime(startTime, durationHours) : ''),
    [startTime, durationHours],
  )

  const currency = currencies.find((c) => c.code === currencyCode) ?? currencies[0]
  const money = (amount: number) => formatPrice(amount, currency, locale)

  const total = pricePerPerson !== null ? pricePerPerson * quantity : null
  const canReserve = Boolean(date) && (startTimes.length === 0 || Boolean(startTime))
  const overCapacity = maxGroupSize !== null && quantity > maxGroupSize

  const includedLines = [
    guideIncluded ? t('guideIncluded') : null,
    bikeIncluded ? t('bikeIncluded') : null,
    minAge ? t('minAge', { age: String(minAge) }) : null,
    date ? t('rideDateIncluded', { date: formatISODate(date, locale) }) : null,
    startTime
      ? t(endTime ? 'rideTimeIncluded' : 'rideStartOnlyIncluded', { start: startTime, end: endTime })
      : null,
  ].filter((line): line is string => line !== null)

  const onReserve = () => {
    if (!canReserve || overCapacity) return

    setService('bicycle', { id, slug, label: title, image, basePrice: pricePerPerson ?? 0 })
    setBicycleSelection({
      durationLabel: durationHours ? `${durationHours} h` : '',
      durationHours: durationHours ?? 0,
      quantity,
      pickupDate: date,
      pickupTime: startTime,
      returnTime: endTime,
      weekend: false,
      delivery: false,
      unitPrice: pricePerPerson ?? 0,
    })
    // The wizard's own "your trip" step reads `dates.start`, not the bicycle
    // selection — carry the chosen ride date over so the visitor is not asked to pick
    // the same date twice.
    setDates(date, null)
    router.push(`/booking/bike?item=${slug}`)
  }

  const control =
    'h-11 rounded-xl border border-hairline bg-surface-container-lowest font-body-md text-body-md text-primary transition-colors duration-200 focus:border-brand focus:outline-none'
  const label =
    'mb-2 block font-label-caps text-label-caps uppercase tracking-[0.12em] text-on-surface-variant'

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest shadow-widget">
      <div className="border-b border-hairline bg-surface-container-low px-6 py-5">
        <h2 className="font-headline-card text-headline-card text-primary">{t('rideTitle')}</h2>
      </div>

      <div className="p-6">
        {pricePerPerson !== null ? (
          <p className="font-body-md text-body-md text-on-surface-variant">
            {s('from')}{' '}
            <Price
              amount={pricePerPerson}
              currencies={currencies}
              className="font-headline-section text-headline-section text-primary"
            />{' '}
            <span className="text-outline">{s('perPersonShort')}</span>
          </p>
        ) : (
          <p className="font-body-md text-body-md text-on-surface-variant">{s('priceOnRequest')}</p>
        )}

        {/* --- when ---------------------------------------------------------- */}
        <div className="mb-5 mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${panelId}-date`} className={label}>
              {t('rideDate')}
            </label>
            <DatePicker
              id={`${panelId}-date`}
              value={date}
              onChange={setDate}
              placeholder={t('chooseDate')}
              className="w-full"
            />
          </div>

          {startTimes.length ? (
            <div>
              <label htmlFor={`${panelId}-start`} className={label}>
                {s('startTimes')}
              </label>
              <span className="relative block">
                <select
                  id={`${panelId}-start`}
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className={cn(control, 'w-full appearance-none pe-9 ps-3.5')}
                >
                  {startTimes.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                <Icon
                  name="chevron-down"
                  className="pointer-events-none absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
                />
              </span>
            </div>
          ) : null}
        </div>

        {endTime ? (
          <p className="mb-5 flex items-center gap-2 font-body-md text-caption text-on-surface-variant">
            <Icon name="clock" className="h-4 w-4 shrink-0 text-brand" />
            {t('rideTimeIncluded', { start: startTime, end: endTime })}
          </p>
        ) : null}

        {/* --- how many riders ------------------------------------------------ */}
        <div className="mb-5">
          <span className={label}>{t('howManyRiders')}</span>
          <div className="inline-flex items-center gap-1 rounded-xl border border-hairline p-1">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={quantity <= 1}
              aria-label={t('fewerRiders')}
              className="focus-card grid h-9 w-9 place-items-center rounded-lg text-on-surface-variant transition-colors duration-200 hover:bg-brand/[0.06] hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="minus" className="h-4 w-4" />
            </button>
            <span
              aria-live="polite"
              className="min-w-10 text-center font-body-md text-body-md tabular-nums text-primary"
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(maxGroupSize ?? 20, value + 1))}
              disabled={maxGroupSize !== null && quantity >= maxGroupSize}
              aria-label={t('moreRiders')}
              className="focus-card grid h-9 w-9 place-items-center rounded-lg text-on-surface-variant transition-colors duration-200 hover:bg-brand/[0.06] hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="plus" className="h-4 w-4" />
            </button>
          </div>
          {maxGroupSize !== null ? (
            <p className="mt-2 font-body-md text-caption text-on-surface-variant">
              {t('upTo', { count: String(maxGroupSize) })}
            </p>
          ) : null}
        </div>

        {/* --- what's included, including the chosen date & time -------------- */}
        {includedLines.length ? (
          <ul className="mb-5 space-y-2.5 border-t border-hairline pt-5">
            {includedLines.map((line) => (
              <li
                key={line}
                className="flex items-center gap-2.5 font-body-md text-caption text-on-surface-variant"
              >
                <Icon name="check" className="h-4 w-4 shrink-0 text-brand" />
                {line}
              </li>
            ))}
          </ul>
        ) : null}

        {total !== null ? (
          <div className="mb-5 flex items-baseline justify-between gap-4 rounded-xl border border-hairline bg-surface-container-low p-4">
            <span className="font-body-md text-body-md text-on-surface-variant">{t('total')}</span>
            <span className="font-headline-card text-headline-card tabular-nums text-primary">
              <span aria-live="polite">{money(total)}</span>
            </span>
          </div>
        ) : null}

        {/* A reminder that lives right beside the button it governs — see
            BookingWizard's DateRequiredNotice for the same reminder once checkout
            starts. */}
        {!date ? (
          <p role="alert" className="mb-3 flex items-start gap-2 font-body-md text-caption text-brand">
            <Icon name="alert-triangle" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('dateRequiredHint')}
          </p>
        ) : null}

        {overCapacity ? (
          <p role="alert" className="mb-3 font-body-md text-caption text-error">
            {t('overGroupSize', { count: String(maxGroupSize) })}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onReserve}
          disabled={!canReserve || overCapacity}
          className="focus-card flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 font-body-md text-body-md text-on-primary transition-colors duration-200 hover:bg-brand-light disabled:cursor-not-allowed disabled:bg-surface-container-highest disabled:text-outline"
        >
          {s('reserve')}
          <Icon name="arrow-right" className="h-4 w-4 rtl:rotate-180" />
        </button>
      </div>
    </div>
  )
}
