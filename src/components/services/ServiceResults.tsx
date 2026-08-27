import type { Locale } from '@/i18n/routing'
import { getSiteSettings } from '@/lib/payload/queries'
import { getTours, getHotels, getBicycles, type ListingFilters } from '@/lib/payload/services'

import { JsonLd } from '@/components/seo/JsonLd'
import { itemListNode } from '@/lib/structured-data'

import { ServiceGrid } from './ServiceGrid'
import { TourResultsGrid } from './TourResultsGrid'

type SearchQuery = Record<string, string | string[] | undefined>

export type ResultsKind = 'daily' | 'experience' | 'hotels' | 'bicycles'

const BASE_PATH: Record<ResultsKind, string> = {
  daily: '/tours/daily',
  experience: '/tours/experiences',
  hotels: '/hotels',
  bicycles: '/bicycles',
}

/** Reads one search param, tolerating the array form Next produces for repeats. */
const one = (query: SearchQuery, key: string): string | undefined => {
  const value = query[key]
  return Array.isArray(value) ? value[0] : value
}

const positive = (query: SearchQuery, key: string): number | undefined => {
  const value = Number(one(query, key))
  return Number.isFinite(value) && value > 0 ? value : undefined
}

export const parseFilters = (query: SearchQuery): ListingFilters => ({
  page: Number(one(query, 'page')) || 1,
  // The store, the URL serializer and both queries already carried `destination`;
  // this parser was the one link that dropped it, so `?destination=cairo` reached the
  // page and was silently discarded before it ever became a where clause.
  destination: one(query, 'destination'),
  difficulty: one(query, 'difficulty'),
  starRating: positive(query, 'starRating'),
  minPrice: positive(query, 'minPrice'),
  maxPrice: positive(query, 'maxPrice'),
  sortBy: one(query, 'sortBy'),
})

/**
 * The data half of a listing page, kept separate from the page shell so it can sit
 * behind its own Suspense boundary.
 *
 * That split is the point: the header, filter bar and footer are rendered from
 * translations alone and stream to the browser immediately, while this component is
 * still waiting on the database. Previously the whole document blocked on the slowest
 * query before a single byte was sent.
 */
export const ServiceResults = async ({
  kind,
  locale,
  query,
  listName,
}: {
  kind: ResultsKind
  locale: Locale
  query: SearchQuery
  /** Page title, reused as the name of the emitted schema.org ItemList. */
  listName: string
}) => {
  const filters = parseFilters(query)

  // Settings and results are independent, so they overlap rather than queue.
  const [data, settings] = await Promise.all([
    kind === 'hotels'
      ? getHotels(locale, filters)
      : kind === 'bicycles'
        ? getBicycles(locale, undefined, filters)
        : getTours(locale, kind === 'daily' ? 'daily' : 'experience', filters),
    getSiteSettings(locale),
  ])

  // Tours and experiences have their own layouts; hotels and bicycles keep the
  // shared grid until they get the same treatment.
  const isTourListing = kind === 'daily' || kind === 'experience'

  // Paging and sort are excluded on purpose: neither removes a result, so neither
  // explains an empty page.
  const filtered =
    Boolean(filters.destination) ||
    Boolean(filters.difficulty) ||
    filters.starRating !== undefined ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined

  return (
    <>
      {isTourListing ? (
        <TourResultsGrid
          data={data}
          basePath={BASE_PATH[kind]}
          currencies={settings.currencies}
          variant={kind === 'daily' ? 'daily' : 'experience'}
          filtered={filtered}
        />
      ) : (
        <ServiceGrid data={data} basePath={BASE_PATH[kind]} currencies={settings.currencies} />
      )}
      {/* Crawlers and answer engines read the listing order from the initial HTML. */}
      {data.items.length > 0 ? (
        <JsonLd data={itemListNode(data.items, locale, BASE_PATH[kind], listName)} />
      ) : null}
    </>
  )
}
