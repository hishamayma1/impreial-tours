import {
  calculateBicycleRentalTotal,
  calculateBicycleTourTotal,
  calculateDailyTourTotal,
  calculateExperienceTotal,
  calculateHotelTotal,
  nightsBetween,
  type PriceBreakdown,
} from '../pricing.ts'
import type { BookingStateSnapshot } from '@/stores/booking-store'

const EMPTY: PriceBreakdown = { lines: [], subtotal: 0 }

/** Friday and Saturday — the weekend the rental surcharge is named for, in Egypt. */
export const isWeekendDate = (iso: string | null | undefined): boolean => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const [y, m, d] = iso.split('-').map(Number)
  // UTC, so the answer is the same in the browser and on the server.
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return day === 5 || day === 6
}

/**
 * Prices the basket with the same functions `/api/bookings` uses, over the pricing
 * rules the product page handed to the checkout.
 *
 * This replaces a running total that re-implemented the maths by hand and got it
 * wrong in three places (hotel nights and seasons, child rates, guided-ride riders).
 * Calling the server's own functions is the only way the figure on the review step
 * and the figure on the booking record stay the same number.
 */
export const estimateBooking = (state: BookingStateSnapshot): PriceBreakdown => {
  const pricing = state.itemSnapshot?.pricing
  if (!pricing) return EMPTY

  const { adults, children } = state.travelers

  switch (pricing.kind) {
    case 'dailyTour':
      return calculateDailyTourTotal({ tour: pricing, adults, children })

    case 'experience':
      return calculateExperienceTotal({
        experience: {
          pricing: {
            basePricePerPerson: pricing.basePricePerPerson,
            singleSupplement: pricing.singleSupplement,
            priceTiers: pricing.priceTiers,
          },
        },
        travellers: adults + children,
        singleRooms: state.tourOptions.singleRooms,
        departureDate: state.dates.start,
      })

    case 'hotel': {
      if (!state.hotelSelection.length) return EMPTY
      const nights = nightsBetween(state.dates.start, state.dates.end)
      return calculateHotelTotal({
        roomTypes: pricing.roomTypes,
        selections: state.hotelSelection,
        checkIn: state.dates.start,
        checkOut: state.dates.end,
        // Before the dates are chosen, show one night rather than nothing.
        nights: nights || 1,
        seasonalRates: pricing.seasonalRates,
      })
    }

    case 'bikeRental': {
      const selection = state.bicycleSelection
      if (!selection) return EMPTY
      return calculateBicycleRentalTotal({
        ...pricing.config,
        bands: pricing.bands,
        hours: selection.durationHours,
        quantity: selection.quantity,
        weekend: isWeekendDate(state.dates.start),
        delivery: selection.delivery,
      })
    }

    case 'guidedRide':
      return calculateBicycleTourTotal({
        pricePerPerson: pricing.pricePerPerson,
        riders: state.bicycleSelection?.quantity ?? adults + children,
      })
  }
}

/** Nights in the stay, or 0 before both dates are chosen. */
export const stayNights = (state: Pick<BookingStateSnapshot, 'dates'>): number =>
  state.dates.start && state.dates.end ? nightsBetween(state.dates.start, state.dates.end) : 0
