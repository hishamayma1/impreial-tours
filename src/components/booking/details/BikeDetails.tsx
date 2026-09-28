'use client'

import { useId, useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { DatePicker } from '@/components/ui/DatePicker'
import { Icon } from '@/components/ui/Icon'
import { addHoursToTime } from '@/lib/date'
import { isWeekendDate } from '@/lib/booking/estimate'
import type { StepErrors } from '@/lib/booking/validate'
import { clampHours, formatDuration, presetHours, toPricingConfig } from '@/lib/rental-pricing'
import { cn } from '@/lib/utils'
import { formatPrice, useBookingStore, usePreferencesStore } from '@/stores'
import type { ItemPricing } from '@/stores/booking-store'
import type { CurrencyVM } from '@/types/content'

import { CheckboxCard, Field, SectionTitle, Select, Stepper } from '../fields'

type RentalPricing = Extract<ItemPricing, { kind: 'bikeRental' }>
type RidePricing = Extract<ItemPricing, { kind: 'guidedRide' }>

const useMoney = (currencies: CurrencyVM[]) => {
  const locale = useLocale()
  const currencyCode = usePreferencesStore((state) => state.currency)
  const currency = currencies.find((c) => c.code === currencyCode) ?? currencies[0]
  return (amount: number) => formatPrice(amount, currency, locale)
}

/**
 * Bike rental: pickup date and time, how long, how many bikes, and hotel delivery.
 *
 * Opens pre-filled from the planner on the bike page. The return time follows from the
 * pickup time and duration, and the weekend surcharge follows from the date — neither
 * is something the visitor sets, so neither is a control here.
 */
export const BikeRentalDetails = ({
  pricing,
  errors,
  currencies,
}: {
  pricing: RentalPricing
  errors: StepErrors
  currencies: CurrencyVM[]
}) => {
  const t = useTranslations('booking')
  const b = useTranslations('bicycles')
  const money = useMoney(currencies)
  const dateId = useId()
  const timeId = useId()

  const start = useBookingStore((state) => state.dates.start)
  const setDates = useBookingStore((state) => state.setDates)
  const selection = useBookingStore((state) => state.bicycleSelection)
  const setSelection = useBookingStore((state) => state.setBicycleSelection)

  const config = useMemo(
    () => toPricingConfig({ ...pricing.config, bands: pricing.bands }),
    [pricing],
  )
  const presets = useMemo(() => presetHours(config), [config])

  const labels = {
    hour: b('unitHour'),
    minute: b('unitMinute'),
    day: b('unitDay'),
    days: b('unitDays'),
  }

  const hours = selection?.durationHours ?? 0
  const pickupTime = selection?.pickupTime ?? ''
  const quantity = selection?.quantity ?? 1
  const weekend = isWeekendDate(start)

  const setHours = (value: number) => {
    const next = clampHours(config, value)
    setSelection({
      durationHours: next,
      durationLabel: formatDuration(next, labels),
      returnTime: pickupTime ? addHoursToTime(pickupTime, next) : '',
    })
  }

  const err = (key: string) =>
    errors[key] ? t(`errors.${errors[key]}`, { count: pricing.inventory ?? 0 }) : ''

  return (
    <section>
      <h2 className="mb-6 font-headline-card text-headline-card text-primary">
        {t('steps.details')}
      </h2>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={t('bike.pickupDate')} labelId={dateId} required error={err('start')}>
          <DatePicker
            aria-labelledby={dateId}
            value={start ?? ''}
            invalid={!!errors.start}
            placeholder={t('chooseDate')}
            className="w-full"
            onChange={(iso) => {
              setDates(iso, null)
              setSelection({ pickupDate: iso, weekend: isWeekendDate(iso) })
            }}
          />
        </Field>

        {pricing.pickupSlots.length ? (
          <Field label={t('bike.pickupTime')} htmlFor={timeId} required error={err('startTime')}>
            <Select
              id={timeId}
              value={pickupTime}
              invalid={!!errors.startTime}
              onChange={(value) =>
                setSelection({
                  pickupTime: value,
                  returnTime: value && hours ? addHoursToTime(value, hours) : '',
                })
              }
            >
              <option value="">{t('chooseTime')}</option>
              {pricing.pickupSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>

      {weekend && pricing.config.weekendSurchargePct ? (
        <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand/[0.07] px-3 py-1.5 font-body-md text-caption text-brand">
          <Icon name="calendar" className="h-3.5 w-3.5" />
          {t('bike.weekendNote', { pct: pricing.config.weekendSurchargePct })}
        </p>
      ) : null}

      <SectionTitle>{t('bike.duration')}</SectionTitle>
      <div data-field-error={errors.duration ? true : undefined}>
        {presets.length ? (
          <div role="group" aria-label={t('bike.duration')} className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const band = config.bands.find((entry) => entry.durationHours === preset)
              const active = Math.abs(hours - preset) < 1e-9
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setHours(preset)}
                  className={cn(
                    'inline-flex h-10 items-center rounded-full border px-4 font-body-md text-caption transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                    active
                      ? 'border-brand bg-brand text-on-primary'
                      : 'border-hairline text-on-surface-variant hover:border-brand/50 hover:text-brand',
                  )}
                >
                  {band ? band.durationLabel : formatDuration(preset, labels)}
                </button>
              )
            })}
          </div>
        ) : null}
        {config.pricingMode !== 'bands' ? (
          <Stepper
            label={t('bike.hours')}
            hint={hours ? formatDuration(hours, labels) : undefined}
            value={hours}
            min={config.minHours}
            max={config.maxHours}
            onChange={setHours}
            decreaseLabel={t('decrease')}
            increaseLabel={t('increase')}
          />
        ) : null}
        {errors.duration ? (
          <p className="mt-1 font-body-md text-caption text-error">{err('duration')}</p>
        ) : null}
        {pickupTime && hours ? (
          <p className="mt-2 flex items-center gap-2 font-body-md text-caption text-on-surface-variant">
            <Icon name="clock" className="h-4 w-4 text-brand" />
            {t('bike.returnBy', { time: addHoursToTime(pickupTime, hours) })}
          </p>
        ) : null}
      </div>

      <SectionTitle>{t('bike.bikes')}</SectionTitle>
      <Stepper
        label={t('bike.bikes')}
        hint={pricing.inventory !== null ? b('stockLeft', { count: String(pricing.inventory) }) : undefined}
        value={quantity}
        min={1}
        max={Math.max(1, Math.min(20, pricing.inventory ?? 20))}
        onChange={(v) => setSelection({ quantity: v })}
        error={err('quantity')}
        decreaseLabel={t('decrease')}
        increaseLabel={t('increase')}
      />

      {pricing.config.deliveryFee ? (
        <div className="mt-4">
          <CheckboxCard
            checked={selection?.delivery ?? false}
            onChange={(checked) => setSelection({ delivery: checked })}
            label={b('deliverToHotel')}
            trailing={`+${money(pricing.config.deliveryFee)}`}
          />
        </div>
      ) : null}

      {pricing.deposit ? (
        <p className="mt-4 font-body-md text-caption text-on-surface-variant">
          {b('depositNote', { amount: money(pricing.deposit) })}
        </p>
      ) : null}
    </section>
  )
}

/**
 * A guided ride: a seat on a departure. Date, start time and number of riders are the
 * whole booking — the route, bike and guide are part of the product.
 */
export const GuidedRideDetails = ({
  pricing,
  errors,
  currencies,
}: {
  pricing: RidePricing
  errors: StepErrors
  currencies: CurrencyVM[]
}) => {
  const t = useTranslations('booking')
  const money = useMoney(currencies)
  const dateId = useId()
  const timeId = useId()

  const start = useBookingStore((state) => state.dates.start)
  const setDates = useBookingStore((state) => state.setDates)
  const selection = useBookingStore((state) => state.bicycleSelection)
  const setSelection = useBookingStore((state) => state.setBicycleSelection)
  const setTravelers = useBookingStore((state) => state.setTravelers)

  const riders = selection?.quantity ?? 1
  const startTime = selection?.pickupTime ?? ''
  const endTime = startTime && pricing.durationHours ? addHoursToTime(startTime, pricing.durationHours) : ''

  const err = (key: string) =>
    errors[key] ? t(`errors.${errors[key]}`, { count: pricing.maxGroupSize ?? 0 }) : ''

  return (
    <section>
      <h2 className="mb-6 font-headline-card text-headline-card text-primary">
        {t('steps.details')}
      </h2>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={t('bike.rideDate')} labelId={dateId} required error={err('start')}>
          <DatePicker
            aria-labelledby={dateId}
            value={start ?? ''}
            invalid={!!errors.start}
            placeholder={t('chooseDate')}
            className="w-full"
            onChange={(iso) => {
              setDates(iso, null)
              setSelection({ pickupDate: iso })
            }}
          />
        </Field>

        {pricing.startTimes.length ? (
          <Field
            label={t('tour.startTime')}
            htmlFor={timeId}
            required
            error={err('startTime')}
            hint={endTime ? t('bike.rideEnds', { time: endTime }) : undefined}
          >
            <Select
              id={timeId}
              value={startTime}
              invalid={!!errors.startTime}
              onChange={(value) =>
                setSelection({
                  pickupTime: value,
                  returnTime:
                    value && pricing.durationHours ? addHoursToTime(value, pricing.durationHours) : '',
                })
              }
            >
              <option value="">{t('chooseTime')}</option>
              {pricing.startTimes.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>

      <SectionTitle>{t('bike.riders')}</SectionTitle>
      <Stepper
        label={t('bike.riders')}
        hint={[
          pricing.pricePerPerson ? `${money(pricing.pricePerPerson)} ${t('perPerson')}` : null,
          pricing.minAge ? t('bike.minAge', { age: pricing.minAge }) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        value={riders}
        min={1}
        max={pricing.maxGroupSize ?? 20}
        onChange={(v) => {
          setSelection({ quantity: v })
          // The server bills a guided ride per rider; keep the headcount it records in step.
          setTravelers({ adults: v, children: 0, infants: 0 })
        }}
        error={err('quantity')}
        decreaseLabel={t('decrease')}
        increaseLabel={t('increase')}
      />
    </section>
  )
}
