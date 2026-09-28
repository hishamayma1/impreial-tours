'use client'

import type { StepErrors } from '@/lib/booking/validate'
import { useBookingStore } from '@/stores'
import type { CurrencyVM } from '@/types/content'

import { BikeRentalDetails, GuidedRideDetails } from './details/BikeDetails'
import { HotelDetails } from './details/HotelDetails'
import { TourDetails } from './details/TourDetails'

/**
 * Step one, which is a different form for every service: what a hotel needs to hold a
 * room has almost nothing in common with what a bike shop needs to hold a bike. The
 * product's own pricing rules (carried in the snapshot) decide which form renders.
 */
export const DetailsStep = ({
  errors,
  currencies,
}: {
  errors: StepErrors
  currencies: CurrencyVM[]
}) => {
  const pricing = useBookingStore((state) => state.itemSnapshot?.pricing)
  if (!pricing) return null

  switch (pricing.kind) {
    case 'dailyTour':
    case 'experience':
      return <TourDetails pricing={pricing} errors={errors} currencies={currencies} />
    case 'hotel':
      return <HotelDetails pricing={pricing} errors={errors} currencies={currencies} />
    case 'bikeRental':
      return <BikeRentalDetails pricing={pricing} errors={errors} currencies={currencies} />
    case 'guidedRide':
      return <GuidedRideDetails pricing={pricing} errors={errors} currencies={currencies} />
  }
}
