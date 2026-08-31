import type { Locale } from '@/i18n/routing'
import { AMENITIES, getHotelPriceRange } from '@/lib/payload/hotels'
import { getDestinationOptions } from '@/lib/payload/queries'

import { HotelFilters } from './HotelFilters'

/**
 * Server half of the hotels filter bar: resolves the destination list and the real
 * price bounds, then hands them to the client control.
 *
 * Both reads are cached for an hour and identical for every visitor on the route, so
 * fetching them on the client would buy nothing and leave the bar empty until they
 * landed. Behind its own Suspense boundary, the page shell still streams first.
 */
export const HotelFilterBar = async ({ locale }: { locale: Locale }) => {
  const [destinations, priceRange] = await Promise.all([
    getDestinationOptions(locale),
    getHotelPriceRange(locale),
  ])

  return (
    <HotelFilters destinations={destinations} amenities={AMENITIES} priceRange={priceRange} />
  )
}
