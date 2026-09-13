import 'server-only'

import type { Where } from 'payload'

import type { Locale } from '@/i18n/routing'
import { entryPrice, toPricingConfig, type RentalPricingConfig } from '@/lib/rental-pricing'
import type { BicycleCardVM, PaginatedVM } from '@/types/services'

import { getPayloadClient } from './client'
import { cached, PAGE_SIZE } from './services'
import { toImage } from './mappers'
import { fallbackBicycleListing, fallbackBicycleCounts, fallbackBicyclePriceRange } from './fallback-data'

/**
 * The bicycles listing — rentals and guided rides in one filterable result set.
 *
 * Split out of services.ts for the reason hotels was: that file's `getBicycles`
 * answers the narrow question "what bikes are there" for the generic grid, while this
 * one owns the listing's own vocabulary — category, e-bike, how long you want it for,
 * what it costs — and the query that makes each of those actually change the results.
 *
 * The listing is two products at once, which is the constraint everything here is
 * shaped by: a rental is priced by time and a ride is priced per person, so the card
 * carries a discriminator and both price shapes rather than pretending to one.
 */

type Doc = Record<string, any>

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null
const bool = (v: unknown): boolean => v === true

// ---------------------------------------------------------------------------
// Filter vocabulary
// ---------------------------------------------------------------------------

/** Mirrors the `category` options in the Bicycles collection. */
export const BIKE_CATEGORIES = ['city', 'electric', 'mountain', 'road', 'touring', 'kids'] as const
export type BikeCategory = (typeof BIKE_CATEGORIES)[number]

export const BIKE_DIFFICULTIES = ['easy', 'moderate', 'hard'] as const
export const FRAME_SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const

export const BICYCLE_SORTS = ['newest', 'priceAsc', 'priceDesc', 'titleAsc'] as const

/**
 * How long the visitor wants the bike, as a facet.
 *
 * This is the listing's answer to the feature the detail page is built around: someone
 * who needs a bike for two hours should be able to say so on the listing and see only
 * the bikes that will actually rent for two hours. Each band is matched against the
 * editor's own `minHours`/`maxHours` window, so it filters on the shop's real rules
 * rather than on a guess.
 */
export const RENTAL_WINDOWS = ['hour', 'halfDay', 'fullDay', 'multiDay'] as const
export type RentalWindow = (typeof RENTAL_WINDOWS)[number]

/** The representative duration each band asks for, in hours. */
export const WINDOW_HOURS: Record<RentalWindow, number> = {
  hour: 1,
  halfDay: 6,
  fullDay: 12,
  multiDay: 48,
}

export type BicycleFilters = {
  page?: number
  q?: string
  /** '' means both rentals and guided rides. */
  bikeType?: 'rental' | 'tour' | ''
  category?: string[]
  destination?: string
  difficulty?: string[]
  frameSizes?: string[]
  window?: RentalWindow | ''
  electric?: boolean
  minPrice?: number
  maxPrice?: number
  sortBy?: string
}

/** Price sorts read the denormalised `priceFrom` — see that field in the collection. */
const SORT_MAP: Record<string, string> = {
  newest: '-createdAt',
  priceAsc: 'priceFrom',
  priceDesc: '-priceFrom',
  titleAsc: 'title',
}

/** Escapes search text so a visitor cannot alter the regex Mongo builds from it. */
const escapeLike = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Turns listing filters into one where clause.
 *
 * Everything hangs off a single `and` because several branches are themselves `or`
 * groups — the search across two fields, the rental window — and sibling keys of one
 * object would let the last one written win.
 *
 * `overrideType` exists for the tab counts, which need this same clause with the type
 * swapped; sharing the function is what stops a count from describing a different
 * result set than the grid beneath it.
 */
const bicycleWhere = (
  filters: BicycleFilters,
  overrideType?: 'rental' | 'tour' | 'any',
): Where => {
  const and: Where[] = [{ _status: { equals: 'published' } }]

  const type =
    overrideType === 'any' ? undefined : (overrideType ?? (filters.bikeType || undefined))
  if (type) and.push({ bikeType: { equals: type } })

  const q = filters.q?.trim()
  if (q) {
    const like = escapeLike(q)
    and.push({ or: [{ title: { like } }, { description: { like } }] })
  }

  if (filters.category?.length) and.push({ category: { in: filters.category } })

  // Matched on the destination's slug, not its id: the filter travels in the URL, and
  // a shareable, crawlable link should not carry a raw ObjectId.
  if (filters.destination) and.push({ 'destination.slug': { equals: filters.destination } })

  /**
   * Difficulty describes a guided ride, so asking for one narrows to rides.
   *
   * The field carries a `defaultValue: 'easy'` and lives on every document, rental or
   * not — so a bare `difficulty in [easy]` matched the entire rental fleet as well,
   * and `?difficulty=easy` returned nine bikes nobody grades. The rail only offers this
   * control on the rides tab, but a shared or crawled URL does not go through the rail.
   */
  if (filters.difficulty?.length) {
    and.push({ bikeType: { equals: 'tour' } })
    and.push({ difficulty: { in: filters.difficulty } })
  }
  if (filters.frameSizes?.length) and.push({ 'specs.frameSizes': { in: filters.frameSizes } })
  if (filters.electric) and.push({ 'specs.electric': { equals: true } })

  if (filters.minPrice !== undefined) and.push({ priceFrom: { greater_than_equal: filters.minPrice } })
  if (filters.maxPrice !== undefined) and.push({ priceFrom: { less_than_equal: filters.maxPrice } })

  /**
   * The rental window, matched against the shop's own limits.
   *
   * A bike qualifies when the asked-for duration falls inside its `minHours`/`maxHours`
   * range. Both bounds are optional in the admin, and a missing bound is not a
   * disqualification — `exists: false` keeps half-configured bikes in the results
   * rather than silently hiding stock because an editor left a field blank. Guided
   * rides have no rental window at all, so asking for one narrows to rentals.
   */
  const window = filters.window
  if (window && window in WINDOW_HOURS) {
    const hours = WINDOW_HOURS[window]
    and.push({ bikeType: { equals: 'rental' } })
    and.push({ or: [{ minHours: { less_than_equal: hours } }, { minHours: { exists: false } }] })
    and.push({ or: [{ maxHours: { greater_than_equal: hours } }, { maxHours: { exists: false } }] })
  }

  return { and }
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

/** The fields a card needs — narrow, because this runs once per result. */
const CARD_SELECT = {
  slug: true,
  title: true,
  description: true,
  image: true,
  bikeType: true,
  category: true,
  priceFrom: true,
  // rental
  specs: true,
  pricingMode: true,
  hourlyRate: true,
  extraHourRate: true,
  minHours: true,
  maxHours: true,
  hourStep: true,
  rentalPricing: true,
  inventory: true,
  // guided ride
  pricePerPerson: true,
  distanceKm: true,
  durationHours: true,
  difficulty: true,
  maxGroupSize: true,
} as const

const bandsOf = (doc: Doc) =>
  (Array.isArray(doc.rentalPricing) ? doc.rentalPricing : []).map((band: Doc) => ({
    durationLabel: str(band?.durationLabel),
    durationHours: numOrNull(band?.durationHours) ?? 0,
    price: numOrNull(band?.price) ?? 0,
    popular: bool(band?.popular),
    note: str(band?.note),
  }))

/** The pricing config as the engine wants it, rebuilt from a raw document. */
export const pricingConfigOf = (doc: Doc): RentalPricingConfig =>
  toPricingConfig({
    pricingMode: doc.pricingMode,
    hourlyRate: numOrNull(doc.hourlyRate),
    extraHourRate: numOrNull(doc.extraHourRate),
    minHours: numOrNull(doc.minHours),
    maxHours: numOrNull(doc.maxHours),
    hourStep: numOrNull(doc.hourStep),
    bands: bandsOf(doc),
    deliveryFee: numOrNull(doc.deliveryFee),
    weekendSurchargePct: numOrNull(doc.weekendSurchargePct),
  })

const bicycleCard = (doc: Doc): BicycleCardVM => {
  const isRental = doc.bikeType !== 'tour'
  const config = isRental ? pricingConfigOf(doc) : null

  return {
    id: String(doc.id),
    slug: str(doc.slug),
    title: str(doc.title),
    summary: str(doc.description),
    image: toImage(doc.image, 'card'),
    /**
     * Read from the derived field where it exists, so the number on the card is the
     * same one the sort and the range filter used. Recomputed only as a fallback, for
     * documents saved before `priceFrom` existed — those have a null in the database
     * until they are next touched, and a card reading "price on request" for a bike
     * with a published rate is worse than one extra reduce over four rows.
     */
    priceFrom: numOrNull(doc.priceFrom) ?? (config ? entryPrice(config) : numOrNull(doc.pricePerPerson)),
    meta: [],
    bikeType: isRental ? 'rental' : 'tour',
    category: str(doc.category),
    electric: bool(doc.specs?.electric),
    gears: numOrNull(doc.specs?.gears),
    frameSizes: Array.isArray(doc.specs?.frameSizes) ? doc.specs.frameSizes.map(str) : [],
    // Rental facts
    hourlyRate: config?.hourlyRate ?? null,
    minHours: config?.minHours ?? null,
    maxHours: config?.maxHours ?? null,
    bands: config ? config.bands.slice(0, 3) : [],
    inventory: numOrNull(doc.inventory),
    // Ride facts
    distanceKm: numOrNull(doc.distanceKm),
    durationHours: numOrNull(doc.durationHours),
    difficulty: str(doc.difficulty),
    maxGroupSize: numOrNull(doc.maxGroupSize),
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * One `find` serves the whole listing.
 *
 * `select` is narrow and `depth` is 1 — a card needs its image populated and its
 * destination only as a filter, never as data — so the query returns roughly a
 * tenth of the bytes a bare `find` would, and the price sorts and range filter are
 * answered from the `priceFrom` index rather than by reading every document.
 */
export const getBicycleListing = cached(
  'bicycles',
  fallbackBicycleListing,
  async (locale: Locale, filters: BicycleFilters = {}): Promise<PaginatedVM<BicycleCardVM>> => {
    const payload = await getPayloadClient()

    const result = await payload.find({
      collection: 'bicycles',
      locale,
      fallbackLocale: 'en',
      where: bicycleWhere(filters),
      depth: 1,
      limit: PAGE_SIZE,
      page: filters.page ?? 1,
      sort: SORT_MAP[filters.sortBy ?? 'newest'] ?? SORT_MAP.newest,
      overrideAccess: true,
      select: CARD_SELECT,
    })

    return {
      items: result.docs.map((doc) => bicycleCard(doc as Doc)),
      page: result.page ?? 1,
      totalPages: result.totalPages,
      totalDocs: result.totalDocs,
    }
  },
  // Its own cache identity: `getBicycles` in services.ts shares the `bicycles` tag and
  // takes a locale too, and keying on the tag alone would let one serve its shape to
  // the other. See the collision documented on `cached` in services.ts.
  /**
   * Versioned, because the where clause is part of what a cached page IS.
   *
   * Scoping the difficulty facet to guided rides changed which documents these
   * arguments select, and `unstable_cache` keys on the arguments alone — so the fixed
   * query kept serving the unfixed result for an hour, from disk, across a rebuild.
   * Bump this whenever the clause changes, not only when the shape does.
   */
  'bicycle-listing:v2',
)

export type BicycleCounts = { all: number; rental: number; tour: number }

/**
 * How many of each kind survive the *other* filters.
 *
 * The type tabs need this to be honest: a tab has to report what it would show if
 * pressed, so the counts deliberately ignore `bikeType` itself. Three `count` calls
 * rather than three `find` calls — each answered from the index without materialising
 * a document — and they run concurrently.
 */
export const getBicycleCounts = cached(
  'bicycles',
  fallbackBicycleCounts,
  async (locale: Locale, filters: BicycleFilters = {}): Promise<BicycleCounts> => {
    const payload = await getPayloadClient()
    const common = { collection: 'bicycles' as const, locale, overrideAccess: true }

    const [all, rental, tour] = await Promise.all([
      payload.count({ ...common, where: bicycleWhere(filters, 'any') }),
      payload.count({ ...common, where: bicycleWhere(filters, 'rental') }),
      payload.count({ ...common, where: bicycleWhere(filters, 'tour') }),
    ])

    return { all: all.totalDocs, rental: rental.totalDocs, tour: tour.totalDocs }
  },
  // Versioned alongside the listing: same clause, so the same staleness applies.
  'bicycle-counts:v2',
)

/**
 * The cheapest and dearest published bike, bounding the price control.
 *
 * Two limit-1 reads against the `priceFrom` index, so the range offered is the range
 * that exists rather than a hard-coded guess most of which selects nothing.
 */
export const getBicyclePriceRange = cached(
  'bicycles',
  fallbackBicyclePriceRange,
  async (locale: Locale): Promise<{ min: number; max: number }> => {
    const payload = await getPayloadClient()

    const common = {
      collection: 'bicycles' as const,
      locale,
      where: {
        and: [{ _status: { equals: 'published' } }, { priceFrom: { greater_than: 0 } }],
      } as Where,
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

    // Rounded outwards to whole fives: an hourly bike rate is a single-digit number,
    // and rounding to tens would collapse a real 6–130 range to 0–130.
    return { min: Math.floor(min / 5) * 5, max: Math.ceil(max / 5) * 5 }
  },
  'bicycle-price-range',
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

const within = <T extends string>(value: string | undefined, allowed: readonly T[]): T | '' =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : ''

/**
 * Reads the listing filters out of `searchParams`, validating every value against the
 * vocabulary above — these reach a database query, and `?category=<anything>` from a
 * crawler should narrow to nothing recognisable rather than travel on unexamined.
 */
export const parseBicycleFilters = (query: SearchQuery): BicycleFilters => {
  const sortBy = one(query, 'sortBy')

  return {
    page: Number(one(query, 'page')) || 1,
    q: one(query, 'q')?.slice(0, 80),
    bikeType: within(one(query, 'bikeType'), ['rental', 'tour'] as const),
    category: many(query, 'category').filter((value) =>
      (BIKE_CATEGORIES as readonly string[]).includes(value),
    ),
    destination: one(query, 'destination'),
    difficulty: many(query, 'difficulty').filter((value) =>
      (BIKE_DIFFICULTIES as readonly string[]).includes(value),
    ),
    frameSizes: many(query, 'frameSizes').filter((value) =>
      (FRAME_SIZES as readonly string[]).includes(value),
    ),
    window: within(one(query, 'window'), RENTAL_WINDOWS),
    electric: one(query, 'electric') === '1',
    minPrice: positive(query, 'minPrice'),
    maxPrice: positive(query, 'maxPrice'),
    sortBy: (BICYCLE_SORTS as readonly string[]).includes(sortBy ?? '') ? sortBy : 'newest',
  }
}

/**
 * Whether the visitor narrowed the list themselves. Paging and sort are excluded:
 * neither removes a result, so neither explains an empty page.
 */
export const hasActiveBicycleFilters = (filters: BicycleFilters): boolean =>
  Boolean(
    filters.q ||
      filters.bikeType ||
      filters.category?.length ||
      filters.destination ||
      filters.difficulty?.length ||
      filters.frameSizes?.length ||
      filters.window ||
      filters.electric ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined,
  )
