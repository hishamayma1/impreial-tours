'use client'

import { useId } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'

import { DatePicker } from '@/components/ui/DatePicker'
import { resolveTierPrice } from '@/lib/pricing'
import type { StepErrors } from '@/lib/booking/validate'
import { cn } from '@/lib/utils'
import { formatPrice, useBookingStore, usePreferencesStore } from '@/stores'
import type { ItemPricing } from '@/stores/booking-store'
import type { CurrencyVM } from '@/types/content'

import { Field, SectionTitle, Stepper, controlClass } from '../fields'

type TourPricing = Extract<ItemPricing, { kind: 'dailyTour' | 'experience' }>

/**
 * Day tours and multi-day experiences.
 *
 * What a tour operator needs to hold a seat: the date, the departure time when the tour
 * runs more than one, and the party split by age — because children are charged their
 * own rate and infants ride free. An experience adds the single-room question, since a
 * traveller not sharing pays the supplement.
 */
export const TourDetails = ({
  pricing,
  errors,
  currencies,
}: {
  pricing: TourPricing
  errors: StepErrors
  currencies: CurrencyVM[]
}) => {
  const t = useTranslations('booking')
  const locale = useLocale()
  const dateLabelId = useId()
  const timeId = useId()

  const currencyCode = usePreferencesStore((state) => state.currency)
  const currency = currencies.find((c) => c.code === currencyCode) ?? currencies[0]
  const money = (amount: number) => formatPrice(amount, currency, locale)

  const { adults, children, infants } = useBookingStore(useShallow((state) => state.travelers))
  const setTravelers = useBookingStore((state) => state.setTravelers)
  const start = useBookingStore((state) => state.dates.start)
  const setDates = useBookingStore((state) => state.setDates)
  const { startTime, singleRooms } = useBookingStore(useShallow((state) => state.tourOptions))
  const setTourOptions = useBookingStore((state) => state.setTourOptions)

  const groupMax = pricing.groupSizeMax ?? 40
  const err = (key: string) => (errors[key] ? t(`errors.${errors[key]}`, { count: groupMax }) : '')

  const party = adults + children
  // The steppers stop at the group limit rather than letting the visitor overshoot it.
  const roomLeft = Math.max(0, groupMax - party)

  const isDaily = pricing.kind === 'dailyTour'
  const adultRate = isDaily
    ? pricing.pricePerPerson
    : resolveTierPrice(pricing.priceTiers, party, pricing.basePricePerPerson ?? 0)
  const childRate = isDaily ? (pricing.childPrice || pricing.pricePerPerson) : adultRate

  return (
    <section>
      <h2 className="mb-6 font-headline-card text-headline-card text-primary">
        {t('steps.details')}
      </h2>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field
          label={isDaily ? t('tour.date') : t('tour.departureDate')}
          labelId={dateLabelId}
          required
          error={err('start')}
        >
          <DatePicker
            aria-labelledby={dateLabelId}
            value={start ?? ''}
            invalid={!!errors.start}
            onChange={(iso) => setDates(iso, null)}
            placeholder={t('chooseDate')}
            className="w-full"
          />
        </Field>

        {isDaily && pricing.startTimes.length ? (
          <Field label={t('tour.startTime')} required error={err('startTime')}>
            <div role="radiogroup" aria-labelledby={timeId} className="flex flex-wrap gap-2">
              <span id={timeId} className="sr-only">{t('tour.startTime')}</span>
              {pricing.startTimes.map((time) => {
                const active = time === startTime
                return (
                  <button
                    key={time}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTourOptions({ startTime: time })}
                    className={cn(
                      'h-12 rounded-xl border px-4 font-body-md text-body-md tabular-nums transition-colors duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                      active
                        ? 'border-brand bg-brand text-on-primary'
                        : 'border-hairline bg-surface-container-lowest text-primary hover:border-brand/50',
                    )}
                  >
                    {time}
                  </button>
                )
              })}
            </div>
          </Field>
        ) : null}

        {!isDaily && pricing.durationDays ? (
          <Field label={t('tour.duration')}>
            <p className={cn(controlClass, 'flex items-center bg-surface-container-low')}>
              {t('tour.days', { count: pricing.durationDays })}
            </p>
          </Field>
        ) : null}
      </div>

      <SectionTitle>{t('travellers')}</SectionTitle>
      <div>
        <Stepper
          label={t('adults')}
          hint={`${t('tour.adultsHint')}${adultRate ? ` · ${money(adultRate)} ${t('perPerson')}` : ''}`}
          value={adults}
          min={1}
          max={adults + roomLeft}
          onChange={(v) => setTravelers({ adults: v })}
          error={err('adults')}
          decreaseLabel={t('decrease')}
          increaseLabel={t('increase')}
        />
        <Stepper
          label={t('children')}
          hint={`${t('tour.childrenHint')}${childRate ? ` · ${money(childRate)} ${t('perPerson')}` : ''}`}
          value={children}
          max={children + roomLeft}
          onChange={(v) => setTravelers({ children: v })}
          decreaseLabel={t('decrease')}
          increaseLabel={t('increase')}
        />
        <Stepper
          label={t('infants')}
          hint={t('tour.infantsHint')}
          value={infants}
          max={10}
          onChange={(v) => setTravelers({ infants: v })}
          decreaseLabel={t('decrease')}
          increaseLabel={t('increase')}
        />
      </div>
      {pricing.groupSizeMax ? (
        <p className="mt-2 font-body-md text-caption text-on-surface-variant">
          {t('tour.groupMax', { count: pricing.groupSizeMax })}
        </p>
      ) : null}

      {!isDaily && pricing.singleSupplement ? (
        <>
          <SectionTitle>{t('tour.accommodation')}</SectionTitle>
          <Stepper
            label={t('tour.singleRooms')}
            hint={t('tour.singleRoomsHint', { amount: money(pricing.singleSupplement) })}
            value={Math.min(singleRooms, party)}
            max={party}
            onChange={(v) => setTourOptions({ singleRooms: v })}
            error={err('singleRooms')}
            decreaseLabel={t('decrease')}
            increaseLabel={t('increase')}
          />
        </>
      ) : null}
    </section>
  )
}
