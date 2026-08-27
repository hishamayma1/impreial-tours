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
  BicycleDetailVM,
  AlternateSlugs,
} from '@/types/services'

import { getPayloadClient } from './client'
import { toImage } from './mappers'

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
 */
const cached = <A extends unknown[], T>(
  tag: string,
  fallback: T,
  loader: (...args: A) => Promise<T>,
) => {
  return (...args: A): Promise<T> =>
    unstable_cache(
      async () => {
        try {
          return await loader(...args)
        } catch (error) {
          console.error(`[payload] "${tag}" read failed`, error)
          return fallback
        }
      },
      [tag, ...args.map((a) => JSON.stringify(a))],
      { tags: [tag], revalidate: REVALIDATE_SECONDS },
    )()
}

const emptyPage = <T>(): PaginatedVM<T> => ({ items: [], page: 1, totalPages: 0, totalDocs: 0 })

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

const tourCard = (doc: Doc): ServiceCardVM => {
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

const hotelCard = (doc: Doc): ServiceCardVM => {
  // "From" price is the cheapest per-person rate across every room and occupancy.
  const prices = (Array.isArray(doc.roomTypes) ? doc.roomTypes : [])
    .flatMap((room: Doc) => [
      room?.pricing?.singlePrice,
      room?.pricing?.doublePrice,
      room?.pricing?.triplePrice,
    ])
    .map(numOrNull)
    .filter((n): n is number => n !== null && n > 0)

  return {
    id: String(doc.id),
    slug: str(doc.slug),
    title: str(doc.name),
    summary: str(doc.address),
    image: toImage(doc.heroImage, 'card'),
    priceFrom: prices.length ? Math.min(...prices) : null,
    meta: (Array.isArray(doc.amenities) ? doc.amenities : []).slice(0, 3).map(str),
    rating: numOrNull(doc.starRating),
  }
}

const bicycleCard = (doc: Doc): ServiceCardVM => {
  const bands = Array.isArray(doc.rentalPricing) ? doc.rentalPricing : []
  const cheapest = bands
    .map((b: Doc) => numOrNull(b?.price))
    .filter((n): n is number => n !== null && n > 0)

  const meta: string[] = []
  if (doc.bikeType === 'tour') {
    if (doc.distanceKm) meta.push(`${doc.distanceKm} km`)
    if (doc.difficulty) meta.push(str(doc.difficulty))
  } else if (doc.specs?.electric) {
    meta.push('e-bike')
  }

  return {
    id: String(doc.id),
    slug: str(doc.slug),
    title: str(doc.title),
    summary: str(doc.description),
    image: toImage(doc.image, 'card'),
    priceFrom:
      doc.bikeType === 'tour'
        ? numOrNull(doc.pricePerPerson)
        : cheapest.length
          ? Math.min(...cheapest)
          : null,
    meta,
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
  emptyPage<ServiceCardVM>(),
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
export const getTourOffers = cached('tours', [] as OfferVM[], async (locale: Locale) => {
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

export const getHotels = cached(
  'hotels',
  emptyPage<ServiceCardVM>(),
  async (locale: Locale, filters: ListingFilters = {}): Promise<PaginatedVM<ServiceCardVM>> => {
    const payload = await getPayloadClient()
    const where: Where = { _status: { equals: 'published' } }
    // Matched on the destination's slug, not its id: the filter travels in the URL
    // (`?destination=cairo`), and a shareable, crawlable link should not carry a raw
    // ObjectId. Payload resolves the dotted path across the relationship.
    if (filters.destination) where['destination.slug'] = { equals: filters.destination }
    if (filters.starRating) where.starRating = { greater_than_equal: filters.starRating }
    if (filters.amenities?.length) where.amenities = { in: filters.amenities }

    const result = await payload.find({
      collection: 'hotels',
      locale,
      fallbackLocale: 'en',
      where,
      depth: 1,
      limit: PAGE_SIZE,
      page: filters.page ?? 1,
      sort: filters.sortBy === 'ratingDesc' ? '-starRating' : '-createdAt',
      overrideAccess: true,
      select: {
        slug: true, name: true, address: true, heroImage: true,
        starRating: true, amenities: true, roomTypes: true,
      },
    })

    return {
      items: result.docs.map((doc) => hotelCard(doc as Doc)),
      page: result.page ?? 1,
      totalPages: result.totalPages,
      totalDocs: result.totalDocs,
    }
  },
)

export const getBicycles = cached(
  'bicycles',
  emptyPage<ServiceCardVM>(),
  async (
    locale: Locale,
    bikeType?: 'rental' | 'tour',
    filters: ListingFilters = {},
  ): Promise<PaginatedVM<ServiceCardVM>> => {
    const payload = await getPayloadClient()
    const where: Where = { _status: { equals: 'published' } }
    if (bikeType) where.bikeType = { equals: bikeType }

    const result = await payload.find({
      collection: 'bicycles',
      locale,
      fallbackLocale: 'en',
      where,
      depth: 1,
      limit: PAGE_SIZE,
      page: filters.page ?? 1,
      sort: '-createdAt',
      overrideAccess: true,
      select: {
        slug: true, title: true, description: true, image: true, bikeType: true,
        rentalPricing: true, pricePerPerson: true, distanceKm: true,
        difficulty: true, specs: true,
      },
    })

    return {
      items: result.docs.map((doc) => bicycleCard(doc as Doc)),
      page: result.page ?? 1,
      totalPages: result.totalPages,
      totalDocs: result.totalDocs,
    }
  },
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

const galleryOf = (v: unknown) =>
  Array.isArray(v)
    ? v.map((row: Doc) => ({ image: toImage(row?.image, 'card'), caption: str(row?.caption) }))
    : []

export const getTourBySlug = cached(
  'tours',
  null as TourDetailVM | null,
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
       * Rows with no title are dropped rather than rendered.
       *
       * The itinerary currently stored for the seeded experiences is eight rows in
       * which every field — including the non-localized `dayNumber` — is empty, in
       * all three languages, so the page was painting eight blank "Day" cards and
       * keying them all on `0`. Until that data is repaired this keeps the section
       * hiding itself, which is how the rest of this codebase degrades on missing
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
  null as HotelDetailVM | null,
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
  null as TransferDetailVM | null,
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
      zones: Array.isArray(doc.zones)
        ? doc.zones.map((z: Doc) => ({
            zoneName: str(z?.zoneName),
            areas: textList(z?.hotelsOrAreas),
            vehiclePricing: vehiclePrices(z?.vehiclePricing),
          }))
        : [],
      routes: Array.isArray(doc.routes)
        ? doc.routes.map((r: Doc) => ({
            fromCity: str(r?.fromCity),
            toCity: str(r?.toCity),
            distanceKm: numOrNull(r?.distanceKm),
            estimatedDurationMin: numOrNull(r?.estimatedDurationMin),
            oneWayOnly: bool(r?.oneWayOnly),
            vehiclePricing: vehiclePrices(r?.vehiclePricing),
          }))
        : [],
    } satisfies TransferDetailVM
  },
)

export const getBicycleBySlug = cached(
  'bicycles',
  null as BicycleDetailVM | null,
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
      bikeModel: str(doc.bikeModel),
      specs: {
        frameSize: str(doc.specs?.frameSize),
        gears: numOrNull(doc.specs?.gears),
        electric: bool(doc.specs?.electric),
        weightKg: numOrNull(doc.specs?.weightKg),
      },
      rentalPricing: Array.isArray(doc.rentalPricing)
        ? doc.rentalPricing.map((b: Doc) => ({
            durationLabel: str(b?.durationLabel),
            durationHours: numOrNull(b?.durationHours) ?? 0,
            price: numOrNull(b?.price) ?? 0,
          }))
        : [],
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
