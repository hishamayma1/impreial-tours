import 'server-only'

import type { Where } from 'payload'

import type { Locale } from '@/i18n/routing'
import type { CatalogTourVM, PaginatedVM } from '@/types/services'

import { getPayloadClient } from './client'
import { cached, tourCard, PAGE_SIZE } from './services'
import { fallbackTourCatalog, fallbackTourCounts, fallbackTourPriceRange } from './fallback-data'

/**
 * The combined `/tours` catalogue — daily tours and full experiences in one
 * filterable, sortable, paginated result set.
 *
 * Kept out of services.ts because it answers a different question from the two
 * single-type listings there: those ask "what daily tours are there", this one asks
 * "what journeys match", across both kinds at once. The card mapper and the caching
 * wrapper are shared with services.ts so the two can never describe a tour
 * differently.
 */

type Doc = Record<string, any>

const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

// ---------------------------------------------------------------------------
// Filter vocabulary
// ---------------------------------------------------------------------------

/**
 * Duration bands, declared once so the filter UI and the query cannot drift.
 *
 * Daily tours measure in hours and experiences in days, so every band belongs to
 * exactly one of the two. That is also why picking "half day" while the type tab is
 * on Experiences correctly returns nothing rather than quietly ignoring the band —
 * the combination really is empty, and saying so is more useful than pretending the
 * filter was not applied.
 */
export const DURATION_BANDS = ['halfDay', 'fullDay', 'shortBreak', 'week', 'extended'] as const
export type DurationBand = (typeof DURATION_BANDS)[number]

/** Five hours is where a tour stops leaving room for anything else in the same day. */
const DURATION_WHERE: Record<DurationBand, Where> = {
  halfDay: { durationHours: { less_than_equal: 5 } },
  fullDay: { durationHours: { greater_than: 5 } },
  shortBreak: { durationDays: { less_than_equal: 3 } },
  week: {
    and: [{ durationDays: { greater_than_equal: 4 } }, { durationDays: { less_than_equal: 7 } }],
  },
  extended: { durationDays: { greater_than_equal: 8 } },
}

export const DIFFICULTIES = ['easy', 'moderate', 'hard'] as const
export const TOUR_LANGUAGES = ['en', 'es', 'de'] as const
export const CATALOG_SORTS = ['newest', 'priceAsc', 'priceDesc', 'ratingDesc', 'titleAsc'] as const

export type CatalogFilters = {
  page?: number
  /** Free text, matched against title and summary. */
  q?: string
  /** Empty means both kinds. */
  tourType?: 'daily' | 'experience' | ''
  destination?: string
  difficulty?: string[]
  languages?: string[]
  duration?: DurationBand[]
  badge?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  sortBy?: string
}

/**
 * Price sorts read the denormalised `priceFrom` rather than either pricing branch —
 * see that field's comment in the Tours collection. A tour with no price sorts as
 * null, which Mongo orders first ascending; that is an honest position for "price on
 * request" and costs nothing to compute.
 */
const SORT_MAP: Record<string, string> = {
  newest: '-createdAt',
  priceAsc: 'priceFrom',
  priceDesc: '-priceFrom',
  ratingDesc: '-rating',
  titleAsc: 'title',
}

/** Escapes search text so a visitor cannot alter the regex Mongo builds from it. */
const escapeLike = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Turns catalogue filters into one where clause.
 *
 * Everything is combined under a single `and`, because several of the filters are
 * themselves `or` groups — the duration bands, the search across two fields — and
 * hanging those off sibling keys of one object would let the last one written win.
 *
 * `overrideType` exists for the tab counts, which need the same clause with the type
 * swapped; sharing this function is what stops a count describing a different result
 * set from the grid beneath it.
 */
const catalogWhere = (
  filters: CatalogFilters,
  overrideType?: 'daily' | 'experience' | 'any',
): Where => {
  const and: Where[] = [{ _status: { equals: 'published' } }]

  const type =
    overrideType === 'any' ? undefined : (overrideType ?? (filters.tourType || undefined))
  if (type) and.push({ tourType: { equals: type } })

  const q = filters.q?.trim()
  if (q) {
    const like = escapeLike(q)
    and.push({ or: [{ title: { like } }, { shortDescription: { like } }] })
  }

  // Matched on the destination's slug, not its id: the filter travels in the URL, and
  // a shareable, crawlable link should not carry a raw ObjectId.
  if (filters.destination) and.push({ 'destination.slug': { equals: filters.destination } })

  if (filters.difficulty?.length) and.push({ difficulty: { in: filters.difficulty } })
  // `languages` is hasMany, so `in` reads as "guided in any of these".
  if (filters.languages?.length) and.push({ languages: { in: filters.languages } })
  if (filters.badge) and.push({ badge: { equals: filters.badge } })
  if (filters.minRating !== undefined) and.push({ rating: { greater_than_equal: filters.minRating } })

  if (filters.minPrice !== undefined) {
    and.push({ priceFrom: { greater_than_equal: filters.minPrice } })
  }
  if (filters.maxPrice !== undefined) {
    and.push({ priceFrom: { less_than_equal: filters.maxPrice } })
  }

  const bands = (filters.duration ?? []).filter((band) => band in DURATION_WHERE)
  if (bands.length) and.push({ or: bands.map((band) => DURATION_WHERE[band]) })

  return { and }
}

const catalogCard = (doc: Doc): CatalogTourVM => {
  const tourType = doc.tourType === 'experience' ? 'experience' : 'daily'
  const base = tourType === 'experience' ? '/tours/experiences' : '/tours/daily'

  return {
    ...tourCard(doc),
    tourType,
    href: `${base}/${typeof doc.slug === 'string' ? doc.slug : ''}`,
  }
}

/**
 * One `find` serves the whole catalogue.
 *
 * The obvious alternative — query each type, merge, sort and slice in Node — would
 * read every published tour on every request to render twelve cards, and would get
 * slower with each tour an editor adds. The denormalised `priceFrom` field is what
 * makes the single indexed query possible across a mixed result set.
 *
 * `select` is narrow and `depth` is 1: a card needs its hero image populated and
 * nothing else.
 */
export const getTourCatalog = cached(
  'tours',
  fallbackTourCatalog,
  async (locale: Locale, filters: CatalogFilters = {}): Promise<PaginatedVM<CatalogTourVM>> => {
    const payload = await getPayloadClient()

    const result = await payload.find({
      collection: 'tours',
      locale,
      fallbackLocale: 'en',
      where: catalogWhere(filters),
      depth: 1,
      limit: PAGE_SIZE,
      page: filters.page ?? 1,
      sort: SORT_MAP[filters.sortBy ?? 'newest'] ?? SORT_MAP.newest,
      overrideAccess: true,
      select: {
        slug: true,
        title: true,
        shortDescription: true,
        heroImage: true,
        tourType: true,
        durationHours: true,
        durationDays: true,
        nights: true,
        difficulty: true,
        groupSizeMax: true,
        languages: true,
        pricePerPerson: true,
        pricing: true,
        badge: true,
        rating: true,
      },
    })

    return {
      items: result.docs.map((doc) => catalogCard(doc as Doc)),
      page: result.page ?? 1,
      totalPages: result.totalPages,
      totalDocs: result.totalDocs,
    }
  },
  /**
   * An explicit cache key, distinct from the tag.
   *
   * All three readers in this file share the `tours` tag — they must, so one CMS save
   * refreshes the lot — and the first two take identical arguments. Keying on the tag
   * alone therefore gave them the same cache entry, and whichever ran first served its
   * shape to the other: the grid received the counts object, read no `items` off it,
   * and every filtered view rendered as empty. This is the collision `cached` warns
   * about in services.ts, reached from a second direction.
   */
  'tour-catalog',
)

export type CatalogCounts = { all: number; daily: number; experience: number }

/**
 * How many tours of each kind survive the *other* filters.
 *
 * The type tabs need this to be honest. Without it a visitor has to press
 * "Experiences" to discover that the combination they have assembled matches nothing
 * — and the counts deliberately ignore `tourType` itself, because a tab has to report
 * what it would show if pressed, not what the current tab is already showing.
 *
 * Three `count` calls rather than three `find` calls: each is answered from the index
 * without materialising a document, and they run concurrently.
 */
export const getCatalogCounts = cached(
  'tours',
  fallbackTourCounts,
  async (locale: Locale, filters: CatalogFilters = {}): Promise<CatalogCounts> => {
    const payload = await getPayloadClient()

    const [all, daily, experience] = await Promise.all([
      payload.count({
        collection: 'tours',
        locale,
        where: catalogWhere(filters, 'any'),
        overrideAccess: true,
      }),
      payload.count({
        collection: 'tours',
        locale,
        where: catalogWhere(filters, 'daily'),
        overrideAccess: true,
      }),
      payload.count({
        collection: 'tours',
        locale,
        where: catalogWhere(filters, 'experience'),
        overrideAccess: true,
      }),
    ])

    return { all: all.totalDocs, daily: daily.totalDocs, experience: experience.totalDocs }
  },
  'tour-catalog-counts',
)

/**
 * The cheapest and dearest published tour, used to bound the price control.
 *
 * A hard-coded 0–5000 range would leave most of the input unusable on a catalogue
 * priced 60–900, and would silently clip the top of one priced higher. Two limit-1
 * reads against the `priceFrom` index answer it exactly, and the result is cached for
 * an hour like every other read here.
 */
export const getCatalogPriceRange = cached(
  'tours',
  fallbackTourPriceRange,
  async (locale: Locale): Promise<{ min: number; max: number }> => {
    const payload = await getPayloadClient()

    const where: Where = {
      and: [{ _status: { equals: 'published' } }, { priceFrom: { greater_than: 0 } }],
    }

    const common = {
      collection: 'tours' as const,
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

    // Rounded outwards to whole hundreds, so the ends of the range read as prices
    // rather than as whatever the two extreme tours happen to cost.
    return { min: Math.floor(min / 100) * 100, max: Math.ceil(max / 100) * 100 }
  },
  'tour-catalog-price-range',
)

// ---------------------------------------------------------------------------
// URL <-> filters
// ---------------------------------------------------------------------------

type SearchQuery = Record<string, string | string[] | undefined>

const one = (query: SearchQuery, key: string): string | undefined => {
  const value = query[key]
  return Array.isArray(value) ? value[0] : value
}

/** Repeatable params arrive as a string or an array depending on how many there are. */
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
 * Reads the catalogue filters out of `searchParams`.
 *
 * Every value is validated against the vocabulary above rather than passed through:
 * these end up in a database query, and `?difficulty=<anything>` from a crawler or a
 * hand-edited URL should narrow to nothing recognisable, not reach Mongo unexamined.
 */
export const parseCatalogFilters = (query: SearchQuery): CatalogFilters => {
  const type = one(query, 'type')
  const sortBy = one(query, 'sortBy')
  const rating = Number(one(query, 'minRating'))

  return {
    page: Number(one(query, 'page')) || 1,
    q: one(query, 'q')?.slice(0, 80),
    tourType: type === 'daily' || type === 'experience' ? type : '',
    destination: one(query, 'destination'),
    difficulty: many(query, 'difficulty').filter((value) =>
      (DIFFICULTIES as readonly string[]).includes(value),
    ),
    languages: many(query, 'lang').filter((value) =>
      (TOUR_LANGUAGES as readonly string[]).includes(value),
    ),
    duration: many(query, 'duration').filter((value): value is DurationBand =>
      (DURATION_BANDS as readonly string[]).includes(value),
    ),
    badge: one(query, 'badge') === 'bestseller' || one(query, 'badge') === 'new'
      ? one(query, 'badge')
      : undefined,
    minPrice: positive(query, 'minPrice'),
    maxPrice: positive(query, 'maxPrice'),
    minRating: Number.isFinite(rating) && rating > 0 && rating <= 5 ? rating : undefined,
    sortBy: (CATALOG_SORTS as readonly string[]).includes(sortBy ?? '') ? sortBy : 'newest',
  }
}

/**
 * Whether the visitor narrowed the list themselves.
 *
 * Paging and sort are excluded on purpose: neither removes a result, so neither
 * explains an empty page.
 */
export const hasActiveFilters = (filters: CatalogFilters): boolean =>
  Boolean(
    filters.q ||
      filters.tourType ||
      filters.destination ||
      filters.badge ||
      filters.difficulty?.length ||
      filters.languages?.length ||
      filters.duration?.length ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined ||
      filters.minRating !== undefined,
  )
