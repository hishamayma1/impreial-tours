import type { Locale } from '@/i18n/routing'
import { getDestinationOptions } from '@/lib/payload/queries'

import { ListingFilters } from './ListingFilters'

/**
 * Server half of the filter bar: resolves the destination options, then hands them to
 * the client control.
 *
 * It exists so the page shell does not have to wait on the database. The listing
 * pages stream their header, filter bar and footer from translations alone while the
 * results query is still running; awaiting the destination list directly in the page
 * would have put a database read back in front of that first byte. Behind its own
 * Suspense boundary the shell still streams, and the select fills in with the results.
 */
export const ListingFilterBar = async ({
  variant,
  locale,
}: {
  variant: 'tours' | 'hotels'
  locale: Locale
}) => {
  const destinations = await getDestinationOptions(locale)
  return <ListingFilters variant={variant} destinations={destinations} />
}
