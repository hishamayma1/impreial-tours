'use client'

import { useId } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'

import { DatePicker } from '@/components/ui/DatePicker'
import { Icon } from '@/components/ui/Icon'
import { stayNights } from '@/lib/booking/estimate'
import type { StepErrors } from '@/lib/booking/validate'
import { resolveSeasonMultiplier } from '@/lib/pricing'
import { formatPrice, useBookingStore, usePreferencesStore } from '@/stores'
import type { ItemPricing } from '@/stores/booking-store'
import type { CurrencyVM } from '@/types/content'

import { Field, SectionTitle, Stepper } from '../fields'

type HotelPricing = Extract<ItemPricing, { kind: 'hotel' }>

/**
 * A hotel stay: check-in, check-out, and the rooms reserved from the hotel page.
 *
 * Each room keeps the occupancy it was reserved at (single, double, triple — three
 * different rates) and lets the visitor adjust how many of that room and how many
 * guests sleep in it, up to the room's own maximum.
 */
export const HotelDetails = ({
  pricing,
  errors,
  currencies,
}: {
  pricing: HotelPricing
  errors: StepErrors
  currencies: CurrencyVM[]
}) => {
  const t = useTranslations('booking')
  const s = useTranslations('services')
  const locale = useLocale()
  const inId = useId()
  const outId = useId()

  const currencyCode = usePreferencesStore((state) => state.currency)
  const currency = currencies.find((c) => c.code === currencyCode) ?? currencies[0]
  const money = (amount: number) => formatPrice(amount, currency, locale)

  const dates = useBookingStore(useShallow((state) => state.dates))
  const setDates = useBookingStore((state) => state.setDates)
  const rooms = useBookingStore((state) => state.hotelSelection)
  const updateRoom = useBookingStore((state) => state.updateRoom)
  const removeRoom = useBookingStore((state) => state.removeRoom)

  const nights = stayNights({ dates })
  const multiplier = resolveSeasonMultiplier(pricing.seasonalRates, dates.start)
  const season = pricing.seasonalRates.find((rate) => multiplier !== 1 && rate.multiplier === multiplier)

  const err = (key: string) => (errors[key] ? t(`errors.${errors[key]}`) : '')

  return (
    <section>
      <h2 className="mb-6 font-headline-card text-headline-card text-primary">
        {t('steps.details')}
      </h2>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field
          label={t('hotel.checkIn')}
          labelId={inId}
          required
          error={err('start')}
          hint={pricing.checkInTime ? t('hotel.fromTime', { time: pricing.checkInTime }) : undefined}
        >
          <DatePicker
            aria-labelledby={inId}
            value={dates.start ?? ''}
            invalid={!!errors.start}
            placeholder={t('chooseDate')}
            className="w-full"
            onChange={(iso) =>
              // A check-out that is no longer after the new check-in is cleared rather
              // than left as an impossible stay.
              setDates(iso, dates.end && dates.end > iso ? dates.end : null)
            }
          />
        </Field>
        <Field
          label={t('hotel.checkOut')}
          labelId={outId}
          required
          error={err('end')}
          hint={pricing.checkOutTime ? t('hotel.untilTime', { time: pricing.checkOutTime }) : undefined}
        >
          <DatePicker
            aria-labelledby={outId}
            value={dates.end ?? ''}
            min={dates.start ? nextDay(dates.start) : undefined}
            invalid={!!errors.end}
            placeholder={t('chooseDate')}
            className="w-full"
            onChange={(iso) => setDates(dates.start, iso)}
          />
        </Field>
      </div>

      {nights ? (
        <p className="-mt-1 mb-2 inline-flex items-center gap-2 rounded-full bg-brand/[0.07] px-3 py-1.5 font-body-md text-caption text-brand">
          <Icon name="bed" className="h-3.5 w-3.5" />
          {t('hotel.nights', { count: nights })}
          {season ? ` · ${season.label || t('hotel.seasonalRate')}` : ''}
        </p>
      ) : null}

      <SectionTitle>{t('hotel.rooms')}</SectionTitle>

      {rooms.length ? (
        <ul className="space-y-3">
          {rooms.map((room) => {
            const type = pricing.roomTypes.find((r) => r.id === room.roomTypeId)
            const maxGuests = type?.maxOccupancy ?? 3
            const key = `room:${room.roomTypeId}:${room.occupancy}`
            return (
              <li
                key={`${room.roomTypeId}-${room.occupancy}`}
                className="rounded-xl border border-hairline bg-surface-container-lowest p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-headline-card text-body-lg text-primary">{room.roomName}</p>
                    <p className="font-body-md text-caption text-on-surface-variant">
                      {s(room.occupancy)} · {money(room.unitPrice)} {t('hotel.perPersonNight')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRoom(room.roomTypeId, room.occupancy)}
                    className="shrink-0 rounded-lg px-2 py-1 font-body-md text-caption text-on-surface-variant underline-offset-4 hover:text-error hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    {t('hotel.remove')}
                  </button>
                </div>
                <Stepper
                  label={t('hotel.guestsPerRoom')}
                  hint={t('hotel.maxGuests', { count: maxGuests })}
                  value={room.guests}
                  min={1}
                  max={maxGuests}
                  onChange={(v) => updateRoom(room.roomTypeId, room.occupancy, { guests: v })}
                  error={err(key)}
                  decreaseLabel={t('decrease')}
                  increaseLabel={t('increase')}
                />
                <Stepper
                  label={t('hotel.roomCount')}
                  value={room.quantity}
                  min={1}
                  max={10}
                  onChange={(v) => updateRoom(room.roomTypeId, room.occupancy, { quantity: v })}
                  decreaseLabel={t('decrease')}
                  increaseLabel={t('increase')}
                />
              </li>
            )
          })}
        </ul>
      ) : (
        <p
          data-field-error
          className="rounded-xl border border-error/30 bg-error/5 p-4 font-body-md text-body-md text-error"
        >
          {t('errors.roomsRequired')}
        </p>
      )}
      <p className="mt-3 font-body-md text-caption text-on-surface-variant">{t('hotel.addMoreHint')}</p>
    </section>
  )
}

const nextDay = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + 1))
  return date.toISOString().slice(0, 10)
}
