import 'server-only'

import type { Where } from 'payload'

import type { Locale } from '@/i18n/routing'
import type { PaginatedVM, ServiceCardVM } from '@/types/services'
import type { NavSpotlightItemVM } from '@/types/content'

import { getPayloadClient } from './client'
import { cached, PAGE_SIZE } from './services'
import { toImage } from './mappers'
import { fallbackHotelListing, fallbackHotelPriceRange, fallbackSpotlightHotels } from './fallback-data'

/**
 * The hotels listing, with filters that actually filter.
 *
 * Split out of services.ts because `getHotels` there answers a narrower question and
 * is shared with the generic service grid; this one owns the listing's own vocabulary
 * — amenities, star bands, a real price range — and the query that makes each of them
 * change the result set.
 */

type Doc = Record<string, any>

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

/** The amenity keys the CMS stores, mirrored here so the UI and the query agree. */
export const AMENITIES = [
  'wifi',
  'pool',
  'spa',
  'parking',
  'breakfast',
  'gym',
  'ac',
  'restaurant',
  'airportShuttle',
  'petFriendly',
] as const

export const HOTEL_SORTS = ['newest', 'priceAsc', 'priceDesc', 'ratingDesc', 'nameAsc'] as const

export type HotelFilters = {
  page?: number
  q?: string
  destination?: string
  starRating?: number
  amenities?: string[]
  minPrice?: number
  maxPrice?: number
  sortBy?: string
}

/**
 * Price sorts read the denormalised `priceFrom` — see that field's comment in the
 * Hotels collection. Previously every sort but `ratingDesc` fell through to
 * `-createdAt`, so both price options reordered nothing.
 */
const SORT_MAP: Record<string, string> = {
  newest: '-createdAt',
  priceAsc: 'priceFrom',
  priceDesc: '-priceFrom',
  ratingDesc: '-starRating',
  nameAsc: 'name',
}

/** Escapes search text so a visitor cannot alter the regex Mongo builds from it. */
const escapeLike = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const hotelWhere = (filters: HotelFilters): Where => {
  const and: Where[] = [{ _status: { equals: 'published' } }]

  const q = filters.q?.trim()
  if (q) {
    const like = escapeLike(q)
    and.push({ or: [{ name: { like } }, { address: { like } }] })
  }

  // Matched on the destination's slug, not its id: the filter travels in the URL, and
  // a shareable, crawlable link should not carry a raw ObjectId.
  if (filters.destination) and.push({ 'destination.slug': { equals: filters.destination } })
  if (filters.starRating) and.push({ starRating: { greater_than_equal: filters.starRating } })

  /**
   * Amenities are `all`, not `in`.
   *
   * Someone who ticks Pool and Spa is describing the hotel they want, not offering
   * alternatives — `in` would return every hotel with either, which grows the result
   * set as you add requirements and reads as the filter working backwards.
   */
  if (filters.amenities?.length) and.push({ amenities: { all: filters.amenities } })

  if (filters.minPrice !== undefined) and.push({ priceFrom: { greater_than_equal: filters.minPrice } })
  if (filters.maxPrice !== undefined) and.push({ priceFrom: { less_than_equal: filters.maxPrice } })

  return { and }
}

const hotelCard = (doc: Doc): ServiceCardVM => ({
  id: String(doc.id),
  slug: str(doc.slug),
  title: str(doc.name),
  summary: str(doc.address),
  image: toImage(doc.heroImage, 'card'),
  // Read from the derived field rather than recomputed per card, so the number shown
  // is the same one the sort and the range filter used.
  priceFrom: numOrNull(doc.priceFrom),
  meta: (Array.isArray(doc.amenities) ? doc.amenities : []).map(str),
  rating: numOrNull(doc.starRating),
})

export const getHotelListing = cached(
  'hotels',
  fallbackHotelListing,
  async (locale: Locale, filters: HotelFilters = {}): Promise<PaginatedVM<ServiceCardVM>> => {
    const payload = await getPayloadClient()

    const result = await payload.find({
      collection: 'hotels',
      locale,
      fallbackLocale: 'en',
      where: hotelWhere(filters),
      depth: 1,
      limit: PAGE_SIZE,
      page: filters.page ?? 1,
      sort: SORT_MAP[filters.sortBy ?? 'newest'] ?? SORT_MAP.newest,
      overrideAccess: true,
      select: {
        slug: true,
        name: true,
        address: true,
        heroImage: true,
        starRating: true,
        amenities: true,
        priceFrom: true,
      },
    })

    return {
      items: result.docs.map((doc) => hotelCard(doc as Doc)),
      page: result.page ?? 1,
      totalPages: result.totalPages,
      totalDocs: result.totalDocs,
    }
  },
  'hotel-listing',
)

/**
 * The cheapest and dearest published hotel, bounding the price control.
 *
 * Two limit-1 reads against the `priceFrom` index, so the range offered is the range
 * that exists rather than a hard-coded guess most of which selects nothing.
 */
export const getHotelPriceRange = cached(
  'hotels',
  fallbackHotelPriceRange,
  async (locale: Locale): Promise<{ min: number; max: number }> => {
    const payload = await getPayloadClient()

    const where: Where = {
      and: [{ _status: { equals: 'published' } }, { priceFrom: { greater_than: 0 } }],
    }
    const common = {
      collection: 'hotels' as const,
      locale,
      where,
      limit: 1,
      depth: 0,
      overrideAccess: true,
      select: { priceFrom: true },
    }

    const [low, high] = await Promise.all([
      payload.find({ ...common, sort: 'priceFrom' }),
      payload.find({ ...common, sort: '-priceFrom' }),
    ])

    const min = numOrNull((low.docs[0] as Doc | undefined)?.priceFrom) ?? 0
    const max = numOrNull((high.docs[0] as Doc | undefined)?.priceFrom) ?? 0

    // Rounded outwards to whole tens: hotel rates are smaller numbers than tour
    // prices, so hundreds would collapse a real 85–390 range to 0–400.
    return { min: Math.floor(min / 10) * 10, max: Math.ceil(max / 10) * 10 }
  },
  'hotel-price-range',
)

// ---------------------------------------------------------------------------
// URL <-> filters
// ---------------------------------------------------------------------------

type SearchQuery = Record<string, string | string[] | undefined>

const one = (query: SearchQuery, key: string): string | undefined => {
  const value = query[key]
  return Array.isArray(value) ? value[0] : value
}

const many = (query: SearchQuery, key: string): string[] => {
  const value = query[key]
  if (Array.isArray(value)) return value.filter(Boolean)
  return value ? [value] : []
}

const positive = (query: SearchQuery, key: string): number | undefined => {
  const value = Number(one(query, key))
  return Number.isFinite(value) && value > 0 ? value : undefined
}

/**
 * Reads the listing filters out of `searchParams`, validating every value against the
 * vocabulary above — these reach a database query, and `?amenities=<anything>` from a
 * crawler should narrow to nothing recognisable rather than travel on unexamined.
 */
export const parseHotelFilters = (query: SearchQuery): HotelFilters => {
  const sortBy = one(query, 'sortBy')
  const stars = Number(one(query, 'stars'))

  return {
    page: Number(one(query, 'page')) || 1,
    q: one(query, 'q')?.slice(0, 80),
    destination: one(query, 'destination'),
    starRating: Number.isFinite(stars) && stars >= 1 && stars <= 5 ? stars : undefined,
    amenities: many(query, 'amenities').filter((value) =>
      (AMENITIES as readonly string[]).includes(value),
    ),
    minPrice: positive(query, 'minPrice'),
    maxPrice: positive(query, 'maxPrice'),
    sortBy: (HOTEL_SORTS as readonly string[]).includes(sortBy ?? '') ? sortBy : 'newest',
  }
}

const SPOTLIGHT_SIZE = 3

/**
 * The top-rated hotels, for the Hotels hub's mega-panel recommendation rail.
 *
 * Reuses `hotelWhere`/`hotelCard`'s own query rather than a bespoke find, so a
 * newly-published hotel becomes eligible the same way it becomes eligible for the
 * listing page — no second definition of "published" to drift out of sync.
 */
export const getSpotlightHotels = cached(
  'hotels',
  fallbackSpotlightHotels,
  async (locale: Locale): Promise<NavSpotlightItemVM[]> => {
    const payload = await getPayloadClient()

    const result = await payload.find({
      collection: 'hotels',
      locale,
      fallbackLocale: 'en',
      where: hotelWhere({}),
      depth: 1,
      limit: SPOTLIGHT_SIZE,
      sort: '-starRating',
      overrideAccess: true,
      select: { slug: true, name: true, heroImage: true, starRating: true, priceFrom: true },
    })

    return result.docs.map((doc) => {
      const card = hotelCard(doc as Doc)
      return {
        id: card.id,
        href: `/hotels/${card.slug}`,
        title: card.title,
        image: card.image,
        priceFrom: card.priceFrom,
        rating: card.rating ?? null,
      }
    })
  },
  'hotels:spotlight',
)

/**
 * Whether the visitor narrowed the list themselves. Paging and sort are excluded:
 * neither removes a result, so neither explains an empty page.
 */
export const hasActiveHotelFilters = (filters: HotelFilters): boolean =>
  Boolean(
    filters.q ||
      filters.destination ||
      filters.starRating !== undefined ||
      filters.amenities?.length ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined,
  )
