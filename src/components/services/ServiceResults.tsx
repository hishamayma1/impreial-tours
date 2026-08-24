import type { Locale } from '@/i18n/routing'
import { getSiteSettings } from '@/lib/payload/queries'
import { getTours, getHotels, getBicycles, type ListingFilters } from '@/lib/payload/services'

import { ServiceGrid } from './ServiceGrid'
import { ResourceRecorder } from './ResourceRecorder'

type SearchQuery = Record<string, string | string[] | undefined>

export type ResultsKind = 'daily' | 'experience' | 'hotels' | 'bicycles'

/** Maps a listing to the resource-cache bucket it belongs in. */
const CACHE_KIND = {
  daily: 'tours',
  experience: 'tours',
  hotels: 'hotels',
  bicycles: 'bicycles',
} as const

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
}: {
  kind: ResultsKind
  locale: Locale
  query: SearchQuery
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

  return (
    <>
      <ServiceGrid data={data} basePath={BASE_PATH[kind]} currencies={settings.currencies} />
      {/* Seeds the client cache so a back-navigation to this listing repaints at once. */}
      <ResourceRecorder
        kind={CACHE_KIND[kind]}
        locale={locale}
        filters={{ ...filters, kind }}
        data={data}
      />
    </>
  )
}
