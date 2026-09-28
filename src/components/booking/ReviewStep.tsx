'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/Button'
import { useRouter } from '@/i18n/navigation'
import { formatISODate } from '@/lib/date'
import { estimateBooking, isWeekendDate, stayNights } from '@/lib/booking/estimate'
import { saveBookingSummary, type BookingSummaryData } from '@/lib/booking/summary'
import { useBookingStore } from '@/stores'
import type { BookingStateSnapshot } from '@/stores/booking-store'
import type { CurrencyVM } from '@/types/content'

import { BookingSummary } from './BookingSummary'

type T = ReturnType<typeof useTranslations<'booking'>>

/** "2 adults · 1 child · 1 infant" — only the groups that are there. */
export const partyText = (t: T, travelers: BookingStateSnapshot['travelers']) =>
  [
    travelers.adults ? t('count.adults', { count: travelers.adults }) : null,
    travelers.children ? t('count.children', { count: travelers.children }) : null,
    travelers.infants ? t('count.infants', { count: travelers.infants }) : null,
  ]
    .filter(Boolean)
    .join(' · ')

/**
 * The service-specific rows of the summary, in the order a customer checks them:
 * when, then who, then what exactly. Translated here so the saved receipt reads in the
 * language the booking was made in.
 */
export const buildSummaryRows = (
  state: BookingStateSnapshot,
  t: T,
  s: ReturnType<typeof useTranslations<'services'>>,
  locale: string,
): Array<{ label: string; value: string }> => {
  const pricing = state.itemSnapshot?.pricing
  const date = (iso: string | null) => (iso ? formatISODate(iso, locale) : '')
  const rows: Array<{ label: string; value: string }> = []
  const push = (label: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') return
    rows.push({ label, value: String(value) })
  }

  switch (pricing?.kind) {
    case 'dailyTour':
      push(t('tour.date'), date(state.dates.start))
      push(t('tour.startTime'), state.tourOptions.startTime)
      push(t('travellers'), partyText(t, state.travelers))
      break

    case 'experience':
      push(t('tour.departureDate'), date(state.dates.start))
      if (pricing.durationDays) push(t('tour.duration'), t('tour.days', { count: pricing.durationDays }))
      push(t('travellers'), partyText(t, state.travelers))
      if (state.tourOptions.singleRooms) push(t('tour.singleRooms'), state.tourOptions.singleRooms)
      break

    case 'hotel': {
      const nights = stayNights(state)
      push(t('hotel.checkIn'), date(state.dates.start))
      push(t('hotel.checkOut'), date(state.dates.end))
      if (nights) push(t('hotel.nightsLabel'), t('hotel.nights', { count: nights }))
      state.hotelSelection.forEach((room, index) =>
        push(
          state.hotelSelection.length > 1 ? `${t('hotel.room')} ${index + 1}` : t('hotel.room'),
          `${room.quantity} × ${room.roomName} · ${s(room.occupancy)} · ${t('count.guests', { count: room.guests })}`,
        ),
      )
      push(
        t('hotel.totalGuests'),
        t('count.guests', {
          count: state.hotelSelection.reduce((sum, room) => sum + room.guests * room.quantity, 0),
        }),
      )
      break
    }

    case 'bikeRental': {
      const bike = state.bicycleSelection
      push(t('bike.pickupDate'), date(state.dates.start))
      push(t('bike.pickupTime'), bike?.pickupTime)
      push(t('bike.returnTime'), bike?.returnTime)
      push(t('bike.duration'), bike?.durationLabel)
      push(t('bike.bikes'), bike?.quantity)
      if (bike?.delivery) push(t('bike.delivery'), t('yes'))
      if (isWeekendDate(state.dates.start) && pricing.config.weekendSurchargePct) {
        push(t('bike.weekend'), `+${pricing.config.weekendSurchargePct}%`)
      }
      break
    }

    case 'guidedRide': {
      const bike = state.bicycleSelection
      push(t('bike.rideDate'), date(state.dates.start))
      push(
        t('tour.startTime'),
        bike?.pickupTime ? [bike.pickupTime, bike.returnTime].filter(Boolean).join(' – ') : '',
      )
      push(t('bike.riders'), bike?.quantity)
      break
    }
  }

  push(t('fields.notes'), state.contact.notes.trim())
  return rows
}

/** Server error codes the customer can do something about, each with its own message. */
const KNOWN_ERRORS = [
  'validation', 'date_past', 'date_required', 'dates_invalid', 'group_too_large',
  'not_found', 'unavailable', 'rate_limited', 'out_of_stock',
] as const

export const ReviewStep = ({ currencies }: { currencies: CurrencyVM[] }) => {
  const t = useTranslations('booking')
  const s = useTranslations('services')
  const locale = useLocale()
  const router = useRouter()

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Read once per render — the review step has no inputs, so nothing here changes
  // while it is on screen.
  const state = useBookingStore.getState()
  const pricing = state.itemSnapshot?.pricing
  const estimate = estimateBooking(state)
  const rows = buildSummaryRows(state, t, s, locale)
  const serviceLabel = pricing ? t(`serviceNames.${pricing.kind}`) : ''
  const contactName = `${state.contact.firstName} ${state.contact.lastName}`.trim()

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    setError(null)

    const current = useBookingStore.getState()
    const kind = current.itemSnapshot?.pricing?.kind
    const isBike = kind === 'bikeRental' || kind === 'guidedRide'
    const riders = current.bicycleSelection?.quantity ?? 1

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: current.serviceType,
          itemId: current.itemId,
          slug: current.itemSnapshot?.slug,
          locale,
          dates: {
            start: current.dates.start,
            end: current.serviceType === 'hotel' ? current.dates.end : null,
          },
          travelers:
            kind === 'guidedRide'
              ? { adults: riders, children: 0, infants: 0 }
              : kind === 'bikeRental'
                ? { adults: current.bicycleSelection?.quantity ?? 1, children: 0, infants: 0 }
                : current.travelers,
          hotelSelection: current.hotelSelection.map(({ roomTypeId, occupancy, guests, quantity }) => ({
            roomTypeId,
            occupancy,
            guests,
            quantity,
          })),
          bicycleSelection: isBike
            ? {
                durationHours: current.bicycleSelection?.durationHours || 1,
                quantity: current.bicycleSelection?.quantity ?? 1,
                pickupDate: current.dates.start ?? '',
                pickupTime: current.bicycleSelection?.pickupTime ?? '',
                returnTime: current.bicycleSelection?.returnTime ?? '',
                weekend: isWeekendDate(current.dates.start),
                delivery: current.bicycleSelection?.delivery ?? false,
              }
            : null,
          tourOptions:
            kind === 'dailyTour' || kind === 'experience' ? current.tourOptions : undefined,
          contact: current.contact,
          // No prices are sent: the server recomputes them from the CMS.
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result.success) {
        const code = String(result.error ?? 'server')
        setError(
          (KNOWN_ERRORS as readonly string[]).includes(code)
            ? t(`errors.server.${code}`)
            : t('errors.server.generic'),
        )
        return
      }

      const summary: BookingSummaryData = {
        reference: String(result.bookingReference),
        kind: 'booking',
        createdAt: new Date().toISOString(),
        serviceLabel,
        itemLabel: current.itemSnapshot?.label ?? '',
        rows: buildSummaryRows(current, t, s, locale),
        // The server's figures, not the estimate: the receipt shows what was recorded.
        lines: Array.isArray(result.lines) ? result.lines : estimate.lines,
        total: typeof result.total === 'number' ? result.total : estimate.subtotal,
        contact: {
          name: `${current.contact.firstName} ${current.contact.lastName}`.trim(),
          email: current.contact.email.trim(),
          phone: current.contact.phone.trim(),
        },
      }
      saveBookingSummary(summary)

      router.push(`/booking/confirmation/${summary.reference}`)
      // Cleared after navigating so the review does not flash an empty basket first.
      setTimeout(() => useBookingStore.getState().reset(), 0)
    } catch {
      setError(t('errors.server.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <h2 className="mb-2 font-headline-card text-headline-card text-primary">
        {t('steps.review')}
      </h2>
      <p className="mb-6 font-body-md text-body-md text-on-surface-variant">{t('reviewIntro')}</p>

      <BookingSummary
        mode="review"
        currencies={currencies}
        data={{
          kind: 'booking',
          serviceLabel,
          itemLabel: state.itemSnapshot?.label ?? '',
          rows,
          lines: estimate.lines,
          total: estimate.lines.length ? estimate.subtotal : null,
          contact: {
            name: contactName,
            email: state.contact.email,
            phone: state.contact.phone,
          },
        }}
      />

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-error/30 bg-error/5 p-3 font-body-md text-body-md text-error"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        variant="navy"
        size="lg"
        className="mt-6 w-full justify-center sm:w-auto"
        onClick={submit}
        disabled={submitting}
      >
        {submitting ? t('submitting') : t('confirm')}
      </Button>
      <p className="mt-3 font-body-md text-caption text-on-surface-variant">{t('confirmNote')}</p>
    </section>
  )
}
