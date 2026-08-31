import type { Locale } from '@/i18n/routing'
import { getCatalogCounts, getCatalogPriceRange, parseCatalogFilters } from '@/lib/payload/catalog'
import { getDestinationOptions } from '@/lib/payload/queries'

import { CatalogSidebar } from './CatalogSidebar'

type SearchQuery = Record<string, string | string[] | undefined>

/**
 * Server half of the catalogue filter rail: resolves everything the controls need to
 * describe themselves, then hands it to the client component.
 *
 * The three reads run concurrently and are each cached for an hour, so a filter
 * change costs three index lookups rather than three collection scans. They are
 * resolved here rather than fetched in the browser because the values are identical
 * for every visitor on a given URL — paying for a client round trip would buy nothing
 * and would leave the rail empty until it landed.
 *
 * Deliberately *not* keyed on the query by its Suspense boundary. Keying it would
 * blank the rail to a skeleton on every filter change — including the control the
 * visitor just clicked — so it streams updated counts into the existing markup
 * instead.
 */
export const CatalogFilterPanel = async ({
  locale,
  query,
}: {
  locale: Locale
  query: SearchQuery
}) => {
  const filters = parseCatalogFilters(query)

  const [destinations, priceRange, counts] = await Promise.all([
    getDestinationOptions(locale),
    getCatalogPriceRange(locale),
    getCatalogCounts(locale, filters),
  ])

  return <CatalogSidebar destinations={destinations} priceRange={priceRange} counts={counts} />
}
