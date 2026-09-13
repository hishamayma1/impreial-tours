import 'server-only'
import { unstable_cache } from 'next/cache'

import type { Where } from 'payload'

import type { Locale } from '@/i18n/routing'
import { locales } from '@/i18n/routing'
import type { OfferVM } from '@/types/content'
import type {
  CardFact,
  ServiceCardVM,
  PaginatedVM,
  TourDetailVM,
  HotelDetailVM,
  TransferDetailVM,
  SpotlightTourVM,
  BicycleDetailVM,
  AlternateSlugs,
} from '@/types/services'

import { toPricingConfig } from '@/lib/rental-pricing'

import { getPayloadClient } from './client'
import { toImage } from './mappers'
import { withFallback } from './with-fallback'
import {
  fallbackTourListing,
  fallbackTourOffers,
  fallbackSpotlightTours,
  findFallbackTour,
  findFallbackHotel,
  findFallbackTransfer,
  findFallbackBicycle,
} from './fallback-data'

const REVALIDATE_SECONDS = 3600

/** Section 8: never fetch an unbounded list. */
export const PAGE_SIZE = 12

type Doc = Record<string, any>

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null
const bool = (v: unknown): boolean => v === true
const textList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((row) => str((row as Doc)?.text)).filter(Boolean) : []
const timeList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((row) => str((row as Doc)?.time)).filter(Boolean) : []

/**
 * Same contract as `cachedByLocale` in queries.ts: cache per locale, share one tag so
 * a single CMS save refreshes every language, and degrade to `fallback` on failure
 * rather than taking the page down.
 *
 * `key` is the cache identity and defaults to the tag. The tag alone is not enough
 * once two different reads of the same collection take the same arguments:
 * `getTourOffers` and `getSpotlightTours` are both tagged `tours` and both called with
 * nothing but a locale, so keying on the tag handed them the identical entry
 * `['tours', '"en"']` — whichever ran first served its shape to the other, and the
 * offers carousel received a `{ new, top }` object where it expected an array.
 */
export const cached = <A extends unknown[], T>(
  tag: string,
  fallback: T | ((...args: A) => T),
  loader: (...args: A) => Promise<T>,
  key: string = tag,
) => {
  const guarded = withFallback(loader, fallback, (error) =>
    console.error(`[payload] "${key}" read failed`, error),
  )

  return (...args: A): Promise<T> =>
    unstable_cache(() => guarded(...args), [key, ...args.map((a) => JSON.stringify(a))], {
      tags: [tag],
      revalidate: REVALIDATE_SECONDS,
    })()
}

export const emptyPage = <T>(): PaginatedVM<T> => ({ items: [], page: 1, totalPages: 0, totalDocs: 0 })

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export const tourCard = (doc: Doc): ServiceCardVM => {
  const isDaily = doc.tourType === 'daily'

  const meta: string[] = []
  if (isDaily && doc.durationHours) meta.push(`${doc.durationHours}h`)
  if (!isDaily && doc.durationDays) meta.push(`${doc.durationDays}d`)
  if (doc.difficulty) meta.push(str(doc.difficulty))

  /**
   * Facts are emitted as raw values with a stable `label` key; the card translates
   * the label and formats the value, so a number never has to be re-parsed out of a
   * localized string.
   */
  const facts: CardFact[] = []
  if (isDaily && doc.durationHours) {
    facts.push({ icon: 'clock', value: `${doc.durationHours}`, label: 'duration' })
  }
  if (!isDaily && doc.durationDays) {
    facts.push({ icon: 'calendar', value: `${doc.durationDays}`, label: 'days' })
  }
  if (!isDaily && typeof doc.nights === 'number') {
    facts.push({ icon: 'moon', value: `${doc.nights}`, label: 'nights' })
  }
  if (doc.difficulty) {
    facts.push({ icon: 'signal', value: str(doc.difficulty), label: 'difficulty' })
  }
  if (doc.groupSizeMax) {
    facts.push({ icon: 'users', value: `${doc.groupSizeMax}`, label: 'groupSize' })
  }
  if (Array.isArray(doc.languages) && doc.languages.length) {
    facts.push({ icon: 'globe', value: String(doc.languages.length), label: 'languages' })
  }

  return {
    facts,
    id: String(doc.id),
    slug: str(doc.slug),
    title: str(doc.title),
    summary: str(doc.shortDescription),
    image: toImage(doc.heroImage, 'card'),
    priceFrom: isDaily
      ? numOrNull(doc.pricePerPerson)
      : numOrNull(doc.pricing?.basePricePerPerson),
    meta,
    badge: doc.badge && doc.badge !== 'none' ? str(doc.badge) : null,
    rating: numOrNull(doc.rating),
  }
}


// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export type ListingFilters = {
  page?: number
  destination?: string
  difficulty?: string
  minPrice?: number
  maxPrice?: number
  starRating?: number
  amenities?: string[]
  sortBy?: string
}

const sortMap: Record<string, string> = {
  newest: '-createdAt',
  priceAsc: 'pricePerPerson',
  priceDesc: '-pricePerPerson',
  ratingDesc: '-rating',
}

export const getTours = cached(
  'tours',
  (_locale: Locale, tourType: 'daily' | 'experience', ..._rest: unknown[]) =>
    fallbackTourListing(tourType),
  async (
    locale: Locale,
    tourType: 'daily' | 'experience',
    filters: ListingFilters = {},
  ): Promise<PaginatedVM<ServiceCardVM>> => {
    const payload = await getPayloadClient()
    const where: Where = {
      tourType: { equals: tourType },
      _status: { equals: 'published' },
    }
    // Matched on the destination's slug, not its id: the filter travels in the URL
    // (`?destination=cairo`), and a shareable, crawlable link should not carry a raw
    // ObjectId. Payload resolves the dotted path across the relationship.
    if (filters.destination) where['destination.slug'] = { equals: filters.destination }
    if (filters.difficulty) where.difficulty = { equals: filters.difficulty }

    const priceField = tourType === 'daily' ? 'pricePerPerson' : 'pricing.basePricePerPerson'
    if (filters.minPrice !== undefined) where[priceField] = { greater_than_equal: filters.minPrice }
    if (filters.maxPrice !== undefined) {
      where[priceField] = { ...(where[priceField] as object), less_than_equal: filters.maxPrice }
    }

    const result = await payload.find({
      collection: 'tours',
      locale,
      fallbackLocale: 'en',
      where,
      // depth 1 resolves heroImage only; nothing on a card needs deeper population.
      depth: 1,
      limit: PAGE_SIZE,
      page: filters.page ?? 1,
      sort: sortMap[filters.sortBy ?? 'newest'] ?? '-createdAt',
      overrideAccess: true,
      select: {
        slug: true, title: true, shortDescription: true, heroImage: true,
        tourType: true, durationHours: true, durationDays: true, nights: true,
        difficulty: true, groupSizeMax: true, languages: true,
        pricePerPerson: true, pricing: true, badge: true, rating: true,
      },
    })

    return {
      items: result.docs.map((doc) => tourCard(doc as Doc)),
      page: result.page ?? 1,
      totalPages: result.totalPages,
      totalDocs: result.totalDocs,
    }
  },
)

/**
 * A tour carrying a live offer, shaped for the home page carousel.
 *
 * The href is built from `tourType`, so a slide always lands on that tour's own
 * detail page — `/tours/daily/<slug>` or `/tours/experiences/<slug>`.
 */
const tourOfferCard = (doc: Doc): OfferVM => {
  const base = doc.tourType === 'experience' ? '/tours/experiences' : '/tours/daily'
  const label = str(doc.offer?.label)

  return {
    id: String(doc.id),
    title: str(doc.title),
    href: `${base}/${str(doc.slug)}`,
    // The editor's offer label is the badge. The tour's own `badge` field is
    // deliberately not shown here: it stores raw values ('bestseller', 'new') with no
    // translation behind them, so it would print untranslated on the Spanish and
    // German home pages.
    badges: label ? [{ text: label, tone: 'solid' as const }] : [],
    image: toImage(doc.heroImage, 'wide'),
  }
}

/**
 * Tours flagged for the home page offers carousel, within their date window.
 *
 * Tagged `tours` rather than `offers` so that editing the tour — the document that
 * actually owns this content — is what refreshes the carousel.
 */
export const getTourOffers = cached('tours', fallbackTourOffers, async (locale: Locale) => {
  const payload = await getPayloadClient()
  const now = new Date().toISOString()

  const { docs } = await payload.find({
    collection: 'tours',
    locale,
    fallbackLocale: 'en',
    depth: 1,
    limit: 8,
    sort: '-createdAt',
    where: {
      and: [
        { _status: { equals: 'published' } },
        { 'offer.active': { equals: true } },
        {
          or: [
            { 'offer.activeFrom': { exists: false } },
            { 'offer.activeFrom': { less_than_equal: now } },
          ],
        },
        {
          or: [
            { 'offer.activeUntil': { exists: false } },
            { 'offer.activeUntil': { greater_than_equal: now } },
          ],
        },
      ],
    },
    overrideAccess: true,
    select: { slug: true, title: true, tourType: true, heroImage: true, offer: true },
  })

  return docs.map((doc) => tourOfferCard(doc as Doc))
})

/**
 * The home page spotlight band: what is new, and what is rated highest.
 *
 * One query rather than two. The band shows at most six cards per group out of a
 * catalogue that is only ever a few dozen tours, so pulling a single recent slice and
 * splitting it in memory costs one round trip instead of two, and — unlike two
 * `where`-filtered finds — it can never render an empty band just because no editor
 * has ticked the "New" badge yet.
 *
 * Both groups are drawn from the same pool, so a tour can legitimately appear in both:
 * the newest tour on the site may also be the best rated. The tabs are alternative
 * views of the catalogue, not a partition of it.
 */
const SPOTLIGHT_POOL = 24
const SPOTLIGHT_SIZE = 6

const spotlightCard = (doc: Doc, spotlight: 'new' | 'top'): SpotlightTourVM => {
  const tourType: 'daily' | 'experience' = doc.tourType === 'experience' ? 'experience' : 'daily'
  const base = tourType === 'experience' ? '/tours/experiences' : '/tours/daily'

  return {
    ...tourCard(doc),
    tourType,
    href: `${base}/${str(doc.slug)}`,
    spotlight,
  }
}

export const getSpotlightTours = cached(
  'tours',
  fallbackSpotlightTours,
  async (locale: Locale) => {
    const payload = await getPayloadClient()

    const { docs } = await payload.find({
      collection: 'tours',
      locale,
      fallbackLocale: 'en',
      depth: 1,
      limit: SPOTLIGHT_POOL,
      // The pool is the most recent slice, so "new" is already in order and "top" is
      // sorted out of it below.
      sort: '-createdAt',
      where: { _status: { equals: 'published' } },
      overrideAccess: true,
      select: {
        slug: true, title: true, shortDescription: true, heroImage: true,
        tourType: true, durationHours: true, durationDays: true, nights: true,
        difficulty: true, groupSizeMax: true, languages: true,
        pricePerPerson: true, pricing: true, badge: true, rating: true,
      },
    })

    const pool = docs as Doc[]

    // An editor's explicit "New" badge outranks recency; within each half the
    // `-createdAt` order the query returned is preserved.
    const flagged = pool.filter((doc) => doc.badge === 'new')
    const rest = pool.filter((doc) => doc.badge !== 'new')

    const top = [...pool]
      .filter((doc) => numOrNull(doc.rating) !== null)
      .sort((a, b) => (numOrNull(b.rating) ?? 0) - (numOrNull(a.rating) ?? 0))

    return {
      new: [...flagged, ...rest].slice(0, SPOTLIGHT_SIZE).map((doc) => spotlightCard(doc, 'new')),
      /**
       * Falls back to the pool when nothing carries a rating yet. A band whose second
       * tab is empty reads as broken; the same tours in a different order does not.
       */
      top: (top.length ? top : pool).slice(0, SPOTLIGHT_SIZE).map((doc) => spotlightCard(doc, 'top')),
    }
  },
  // Its own cache identity: getTourOffers is also tagged `tours` and also takes just a locale.
  'tours:spotlight',
)


// ---------------------------------------------------------------------------
// Details
// ---------------------------------------------------------------------------

const findOneBySlug = async (
  collection: 'tours' | 'hotels' | 'transfers' | 'bicycles',
  locale: Locale,
  slug: string,
  where: Where = {},
): Promise<Doc | null> => {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection,
    locale,
    fallbackLocale: 'en',
    where: { slug: { equals: slug }, _status: { equals: 'published' }, ...where },
    // depth 2 resolves nested uploads inside arrays (gallery, room images, route stops).
    depth: 2,
    limit: 1,
    overrideAccess: true,
  })
  return (result.docs[0] as Doc) ?? null
}

/**
 * A gallery row, resolved at two sizes.
 *
 * `image` is the 768px `card` crop the thumbnail grid needs. `full` is the 2400px
 * `hero` variant, which the lightbox needs and the card crop cannot stand in for:
 * `card` is not merely smaller, it is cropped to 4:3, so enlarging it on a 2560px
 * display would show both a soft image and a different one from the photograph the
 * editor uploaded. `hero` is width-constrained only, so it keeps the original
 * proportions.
 *
 * Both fall back to the original upload inside `toImage` when a variant was never
 * generated, so an older Media document still opens.
 */
const galleryOf = (v: unknown) =>
  Array.isArray(v)
    ? v.map((row: Doc) => ({
        image: toImage(row?.image, 'card'),
        full: toImage(row?.image, 'hero'),
        caption: str(row?.caption),
      }))
    : []

export const getTourBySlug = cached(
  'tours',
  (_locale: Locale, slug: string, tourType: 'daily' | 'experience') => findFallbackTour(slug, tourType),
  async (locale: Locale, slug: string, tourType: 'daily' | 'experience') => {
    const doc = await findOneBySlug('tours', locale, slug, { tourType: { equals: tourType } })
    if (!doc) return null

    return {
      id: String(doc.id),
      slug: str(doc.slug),
      tourType: doc.tourType,
      title: str(doc.title),
      shortDescription: str(doc.shortDescription),
      overview: doc.overview,
      heroImage: toImage(doc.heroImage, 'hero'),
      gallery: galleryOf(doc.gallery),
      highlights: textList(doc.highlights),
      included: textList(doc.included),
      notIncluded: textList(doc.notIncluded),
      meetingPoint: str(doc.meetingPoint),
      difficulty: str(doc.difficulty),
      groupSizeMax: numOrNull(doc.groupSizeMax),
      rating: numOrNull(doc.rating),
      badge: doc.badge && doc.badge !== 'none' ? str(doc.badge) : null,
      languages: Array.isArray(doc.languages) ? doc.languages.map(str) : [],
      durationHours: numOrNull(doc.durationHours),
      startTimes: timeList(doc.startTimes),
      pricePerPerson: numOrNull(doc.pricePerPerson),
      childPrice: numOrNull(doc.childPrice),
      instantConfirmation: bool(doc.instantConfirmation),
      durationDays: numOrNull(doc.durationDays),
      nights: numOrNull(doc.nights),
      /**
       * Rows with no title and no description are dropped rather than rendered.
       *
       * An array row can exist with none of its localized text filled in — that is
       * what an editor gets from a half-finished translation, and it is what the
       * original seed left behind before `backfill-localized-rows.ts` repaired it.
       * Painting those as blank "Day" cards is worse than a shorter itinerary, so the
       * section hides them, the way the rest of this codebase degrades on missing
       * content. `dayNumber` falls back to the row's position so a document that has
       * titles but lost its numbering still reads correctly.
       */
      itinerary: Array.isArray(doc.itinerary)
        ? doc.itinerary
            .map((day: Doc, index: number) => ({
              dayNumber: numOrNull(day?.dayNumber) ?? index + 1,
              dayTitle: str(day?.dayTitle),
              dayDescription: str(day?.dayDescription),
              meals: Array.isArray(day?.meals) ? day.meals.map(str) : [],
              accommodation: str(day?.accommodation),
              image: toImage(day?.image, 'card'),
            }))
            .filter((day) => day.dayTitle || day.dayDescription)
        : [],
      basePricePerPerson: numOrNull(doc.pricing?.basePricePerPerson),
      singleSupplement: numOrNull(doc.pricing?.singleSupplement),
      priceTiers: Array.isArray(doc.pricing?.priceTiers)
        ? doc.pricing.priceTiers.map((t: Doc) => ({
            minPax: numOrNull(t?.minPax) ?? 0,
            maxPax: numOrNull(t?.maxPax) ?? 0,
            pricePerPerson: numOrNull(t?.pricePerPerson) ?? 0,
          }))
        : [],
    } satisfies TourDetailVM
  },
)

export const getHotelBySlug = cached(
  'hotels',
  (_locale: Locale, slug: string) => findFallbackHotel(slug),
  async (locale: Locale, slug: string) => {
    const doc = await findOneBySlug('hotels', locale, slug)
    if (!doc) return null

    return {
      id: String(doc.id),
      slug: str(doc.slug),
      name: str(doc.name),
      description: doc.description,
      heroImage: toImage(doc.heroImage, 'hero'),
      gallery: galleryOf(doc.gallery),
      starRating: numOrNull(doc.starRating),
      address: str(doc.address),
      amenities: Array.isArray(doc.amenities) ? doc.amenities.map(str) : [],
      checkInTime: str(doc.checkInTime),
      checkOutTime: str(doc.checkOutTime),
      policies: doc.policies,
      roomTypes: Array.isArray(doc.roomTypes)
        ? doc.roomTypes.map((room: Doc) => ({
            id: String(room?.id ?? ''),
            roomName: str(room?.roomName),
            roomDescription: str(room?.roomDescription),
            bedConfiguration: str(room?.bedConfiguration),
            maxOccupancy: numOrNull(room?.maxOccupancy) ?? 2,
            breakfastIncluded: bool(room?.breakfastIncluded),
            refundable: bool(room?.refundable),
            inventory: numOrNull(room?.inventory) ?? 0,
            extraBedPrice: numOrNull(room?.extraBedPrice),
            images: Array.isArray(room?.roomImages)
              ? room.roomImages.map((r: Doc) => toImage(r?.image, 'card'))
              : [],
            pricing: {
              singlePrice: numOrNull(room?.pricing?.singlePrice),
              doublePrice: numOrNull(room?.pricing?.doublePrice),
              triplePrice: numOrNull(room?.pricing?.triplePrice),
            },
          }))
        : [],
      seasonalRates: Array.isArray(doc.seasonalRates)
        ? doc.seasonalRates.map((s: Doc) => ({
            label: str(s?.label),
            startDate: str(s?.startDate),
            endDate: str(s?.endDate),
            multiplier: numOrNull(s?.multiplier) ?? 1,
          }))
        : [],
    } satisfies HotelDetailVM
  },
)

const vehiclePrices = (v: unknown) =>
  Array.isArray(v)
    ? v.map((p: Doc) => ({
        vehicleClass: str(p?.vehicleClass),
        maxPassengers: numOrNull(p?.maxPassengers),
        maxLuggage: numOrNull(p?.maxLuggage),
        price: numOrNull(p?.price) ?? 0,
      }))
    : []

export const getTransferByType = cached(
  'transfers',
  (_locale: Locale, transferType: 'airport' | 'intercity' | 'custom') =>
    findFallbackTransfer(transferType),
  async (locale: Locale, transferType: 'airport' | 'intercity' | 'custom') => {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'transfers',
      locale,
      fallbackLocale: 'en',
      where: { transferType: { equals: transferType }, _status: { equals: 'published' } },
      depth: 2,
      limit: 1,
      overrideAccess: true,
    })
    const doc = result.docs[0] as Doc | undefined
    if (!doc) return null

    return {
      id: String(doc.id),
      slug: str(doc.slug),
      transferType: doc.transferType,
      title: str(doc.title),
      description: str(doc.description),
      heroImage: toImage(doc.heroImage, 'hero'),
      meetAndGreet: bool(doc.meetAndGreet),
      freeWaitingMinutes: numOrNull(doc.freeWaitingMinutes),
      vehicles: Array.isArray(doc.vehicles)
        ? doc.vehicles.map((v: Doc) => ({
            className: str(v?.className),
            image: toImage(v?.image, 'card'),
            maxPassengers: numOrNull(v?.maxPassengers),
            maxLuggage: numOrNull(v?.maxLuggage),
            features: textList(v?.features),
          }))
        : [],
      airports: Array.isArray(doc.airports)
        ? doc.airports
            .filter((a: unknown) => a && typeof a === 'object')
            .map((a: Doc) => ({
              id: String(a.id),
              name: str(a.name),
              code: str(a.code),
              city: str(a.city),
              terminals: Array.isArray(a.terminals)
                ? a.terminals.map((t: Doc) => str(t?.name)).filter(Boolean)
                : [],
            }))
        : [],
      extras: Array.isArray(doc.extras)
        ? doc.extras.map((e: Doc) => ({
            id: String(e?.id ?? ''),
            label: str(e?.label),
            description: str(e?.description),
            price: numOrNull(e?.price) ?? 0,
            perPassenger: bool(e?.perPassenger),
          }))
        : [],
      /**
       * Row ids travel with the zone and the route because they are what the booking
       * route prices from. Matching on the vehicle-class *name* alone let a request
       * name the cheapest zone's Sedan while asking to be driven to the dearest one.
       */
      zones: Array.isArray(doc.zones)
        ? doc.zones.map((z: Doc) => ({
            id: String(z?.id ?? ''),
            zoneName: str(z?.zoneName),
            areas: textList(z?.hotelsOrAreas),
            vehiclePricing: vehiclePrices(z?.vehiclePricing),
          }))
        : [],
      routes: Array.isArray(doc.routes)
        ? doc.routes.map((r: Doc) => ({
            id: String(r?.id ?? ''),
            fromCity: str(r?.fromCity),
            toCity: str(r?.toCity),
            distanceKm: numOrNull(r?.distanceKm),
            estimatedDurationMin: numOrNull(r?.estimatedDurationMin),
            oneWayOnly: bool(r?.oneWayOnly),
            note: str(r?.note),
            vehiclePricing: vehiclePrices(r?.vehiclePricing),
          }))
        : [],
    } satisfies TransferDetailVM
  },
  /**
   * Versioned cache key, bumped when this view model gained `airports`, `extras` and
   * the zone/route row ids.
   *
   * `unstable_cache` entries survive a deploy and live for an hour, and they store the
   * *shape* that was cached, not the shape the code now expects. Without a new key the
   * first hour after release serves pre-upgrade objects with no `airports` array to
   * components that index into one — which is not a stale price, it is a 500 on a
   * booking page. Bump this again the next time the shape changes.
   */
  'transfers:v2',
)

export const getBicycleBySlug = cached(
  'bicycles',
  (_locale: Locale, slug: string) => findFallbackBicycle(slug),
  async (locale: Locale, slug: string) => {
    const doc = await findOneBySlug('bicycles', locale, slug)
    if (!doc) return null

    return {
      id: String(doc.id),
      slug: str(doc.slug),
      bikeType: doc.bikeType,
      title: str(doc.title),
      description: str(doc.description),
      image: toImage(doc.image, 'hero'),
      gallery: Array.isArray(doc.gallery)
        ? doc.gallery.map((g: Doc) => toImage(g?.image, 'card'))
        : [],
      category: str(doc.category),
      bikeModel: str(doc.bikeModel),
      specs: {
        frameSize: str(doc.specs?.frameSize),
        gears: numOrNull(doc.specs?.gears),
        electric: bool(doc.specs?.electric),
        weightKg: numOrNull(doc.specs?.weightKg),
        frameSizes: Array.isArray(doc.specs?.frameSizes) ? doc.specs.frameSizes.map(str) : [],
      },
      rentalPricing: Array.isArray(doc.rentalPricing)
        ? doc.rentalPricing.map((b: Doc) => ({
            durationLabel: str(b?.durationLabel),
            durationHours: numOrNull(b?.durationHours) ?? 0,
            price: numOrNull(b?.price) ?? 0,
            popular: bool(b?.popular),
            note: str(b?.note),
          }))
        : [],
      /**
       * Normalised through the same function the planner and the listing use, so a
       * half-configured bike resolves its defaults once, here, rather than differently
       * in each place that reads it.
       */
      pricing: (() => {
        const config = toPricingConfig({
          pricingMode: doc.pricingMode,
          hourlyRate: numOrNull(doc.hourlyRate),
          extraHourRate: numOrNull(doc.extraHourRate),
          minHours: numOrNull(doc.minHours),
          maxHours: numOrNull(doc.maxHours),
          hourStep: numOrNull(doc.hourStep),
          bands: Array.isArray(doc.rentalPricing)
            ? doc.rentalPricing.map((b: Doc) => ({
                durationLabel: str(b?.durationLabel),
                durationHours: numOrNull(b?.durationHours) ?? 0,
                price: numOrNull(b?.price) ?? 0,
              }))
            : [],
          deliveryFee: numOrNull(doc.deliveryFee),
          weekendSurchargePct: numOrNull(doc.weekendSurchargePct),
        })

        return {
          pricingMode: config.pricingMode,
          hourlyRate: config.hourlyRate,
          extraHourRate: config.extraHourRate,
          minHours: config.minHours,
          maxHours: config.maxHours,
          hourStep: config.hourStep,
          deliveryFee: config.deliveryFee,
          weekendSurchargePct: config.weekendSurchargePct,
        }
      })(),
      pickupSlots: timeList(doc.pickupSlots),
      deposit: numOrNull(doc.deposit),
      includedAccessories: textList(doc.includedAccessories),
      inventory: numOrNull(doc.inventory),
      routeName: str(doc.routeName),
      distanceKm: numOrNull(doc.distanceKm),
      elevationGainM: numOrNull(doc.elevationGainM),
      difficulty: str(doc.difficulty),
      durationHours: numOrNull(doc.durationHours),
      pricePerPerson: numOrNull(doc.pricePerPerson),
      minAge: numOrNull(doc.minAge),
      maxGroupSize: numOrNull(doc.maxGroupSize),
      guideIncluded: bool(doc.guideIncluded),
      bikeIncluded: bool(doc.bikeIncluded),
      startTimes: timeList(doc.startTimes),
      routePlan: Array.isArray(doc.routePlan)
        ? doc.routePlan.map((s: Doc) => ({
            stopName: str(s?.stopName),
            stopDescription: str(s?.stopDescription),
            distanceFromStartKm: numOrNull(s?.distanceFromStartKm),
            image: toImage(s?.image, 'card'),
          }))
        : [],
    } satisfies BicycleDetailVM
  },
  /**
   * A versioned cache key, for the reason spelled out on getTransferBySlug.
   *
   * unstable_cache entries survive a deploy, live for an hour and store the SHAPE that
   * was cached, not the one the code now expects. This read gained `pricing`,
   * `pickupSlots` and `specs.frameSizes` when rentals became time-priced; without a new
   * key the first hour after release serves pre-upgrade objects to a page that indexes
   * into all three, which is a 500 on the booking page rather than a stale price. Bump
   * it again the next time this shape changes.
   */
  'bicycle-detail:v2',
)

// ---------------------------------------------------------------------------
// Static params + language switching
// ---------------------------------------------------------------------------

/**
 * Section 8: pre-render every locale x slug. Runs at build time only, so it reads
 * without the request cache and asks for nothing but the slug.
 */
export const getAllSlugs = async (
  collection: 'tours' | 'hotels' | 'bicycles',
  locale: Locale,
  where: Where = {},
): Promise<string[]> => {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection,
      locale,
      fallbackLocale: 'en',
      where: { _status: { equals: 'published' }, ...where },
      depth: 0,
      limit: 500,
      pagination: false,
      overrideAccess: true,
      select: { slug: true },
    })
    return result.docs.map((doc) => String((doc as Doc).slug)).filter(Boolean)
  } catch (error) {
    // A build without a reachable database still succeeds; those routes fall back
    // to on-demand rendering instead of failing the whole build.
    console.error(`[payload] getAllSlugs("${collection}") failed`, error)
    return []
  }
}

/**
 * Every published document in a collection, with its slug in each language.
 *
 * The sitemap needs this to emit `hreflang` on detail URLs. It costs exactly what
 * calling `getAllSlugs` once per locale already cost — the same one read per locale,
 * keeping the document id instead of discarding it — rather than the per-document
 * `getAlternateSlugs` round trip, which would be one read per document per language.
 *
 * A locale whose read fails contributes nothing, so a partial outage yields a smaller
 * sitemap rather than no sitemap.
 */
export const getLocalizedSlugs = async (
  collection: 'tours' | 'hotels' | 'bicycles',
  where: Where = {},
): Promise<Array<Partial<Record<Locale, string>>>> => {
  const perLocale = await Promise.all(
    locales.map(async (locale) => {
      try {
        const payload = await getPayloadClient()
        const result = await payload.find({
          collection,
          locale,
          fallbackLocale: false,
          where: { _status: { equals: 'published' }, ...where },
          depth: 0,
          limit: 500,
          pagination: false,
          overrideAccess: true,
          select: { slug: true },
        })
        return { locale, docs: result.docs as Doc[] }
      } catch (error) {
        console.error(`[payload] getLocalizedSlugs("${collection}", "${locale}") failed`, error)
        return { locale, docs: [] as Doc[] }
      }
    }),
  )

  const byId = new Map<string, Partial<Record<Locale, string>>>()
  for (const { locale, docs } of perLocale) {
    for (const doc of docs) {
      const slug = str(doc.slug)
      if (!slug) continue
      const id = String(doc.id)
      const entry = byId.get(id) ?? {}
      entry[locale] = slug
      byId.set(id, entry)
    }
  }

  return [...byId.values()]
}

/**
 * Spec Section 5/2.7: switching language on a detail page must land on the SAME
 * document. Slugs are localized, so this resolves the document once and reads its
 * slug in every language.
 */
export const getAlternateSlugs = cached(
  'alternate-slugs',
  {} as AlternateSlugs,
  async (
    collection: 'tours' | 'hotels' | 'bicycles',
    locale: Locale,
    slug: string,
  ): Promise<AlternateSlugs> => {
    const payload = await getPayloadClient()
    const found = await payload.find({
      collection,
      locale,
      where: { slug: { equals: slug } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
      select: { slug: true },
    })
    const doc = found.docs[0] as Doc | undefined
    if (!doc) return {}

    const entries = await Promise.all(
      locales.map(async (code) => {
        const localized = await payload.findByID({
          collection,
          id: doc.id,
          locale: code,
          depth: 0,
          overrideAccess: true,
          select: { slug: true },
        })
        return [code, str((localized as Doc)?.slug)] as const
      }),
    )

    return Object.fromEntries(entries.filter(([, value]) => Boolean(value))) as AlternateSlugs
  },
)
