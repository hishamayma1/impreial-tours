import type { Locale } from '@/i18n/routing'
import { localeLabels } from '@/i18n/routing'
import { siteUrl, localizedPath } from '@/lib/seo'
import type { ImageVM, SiteSettingsVM } from '@/types/content'
import type { HotelDetailVM, ServiceCardVM, TourDetailVM } from '@/types/services'

/**
 * schema.org builders.
 *
 * This is the generative-engine lever. Answer engines lean far harder on explicit
 * markup than on inferring meaning from layout, and a travel site has exactly the
 * shape they reward: a named business, priced offers, locations, ratings.
 *
 * Two rules run through every builder here:
 *
 *  - **Emit the narrowest type that fits.** `TouristTrip` says more than `Product`,
 *    and `Hotel` says more than `LocalBusiness`.
 *  - **Never emit a property we cannot fill.** A blank `telephone` or a zero price is
 *    worse than the absent property: it asserts something false rather than leaving a
 *    gap the engine can fill from elsewhere. `compact` below drops them.
 */

export type JsonLdNode = Record<string, unknown>

/** Removes empty strings, nulls, empty arrays and empty objects, recursively. */
const compact = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    const items = value.map(compact).filter((item) => item !== undefined)
    return (items.length ? items : undefined) as T
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, inner]) => [key, compact(inner)] as const)
      .filter(([, inner]) => inner !== undefined)
    return (entries.length ? Object.fromEntries(entries) : undefined) as T
  }
  if (value === '' || value === null || value === undefined) return undefined as T
  return value
}

/** CMS media URLs are origin-relative; schema.org consumers need absolute ones. */
const absolute = (path: string): string =>
  /^https?:\/\//.test(path) ? path : `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`

const imageUrl = (image: ImageVM | null): string | undefined =>
  image?.url ? absolute(image.url) : undefined

const pageUrl = (locale: Locale, path = ''): string => `${siteUrl}${localizedPath(locale, path)}`

/** Stable @id so every node on the site points at the one business, not a copy. */
const ORGANIZATION_ID = `${siteUrl}/#organization`
const WEBSITE_ID = `${siteUrl}/#website`

/**
 * The business itself. `TravelAgency` is the narrowest schema.org type for a tour
 * operator that sells trips, hotel nights and transfers under one brand.
 */
export const organizationNode = (settings: SiteSettingsVM, locale: Locale): JsonLdNode => {
  const { contact, socialLinks } = settings

  return compact({
    '@type': 'TravelAgency',
    '@id': ORGANIZATION_ID,
    name: settings.brandName,
    url: pageUrl(locale),
    description: settings.defaultSeo.description,
    logo: imageUrl(settings.logo),
    image: imageUrl(settings.defaultSeo.image) ?? imageUrl(settings.logo),
    email: contact.email,
    telephone: contact.phone,
    openingHours: contact.businessHours,
    address: contact.address
      ? { '@type': 'PostalAddress', streetAddress: contact.address, addressCountry: 'EG' }
      : undefined,
    areaServed: { '@type': 'Country', name: 'Egypt' },
    // Every locale the site publishes, so an engine answering in Spanish knows there
    // is a Spanish page rather than translating the English one itself.
    availableLanguage: Object.values(localeLabels).map((label) => label.label),
    contactPoint: compact([
      contact.phone
        ? {
            '@type': 'ContactPoint',
            contactType: 'reservations',
            telephone: contact.phone,
            email: contact.email,
            availableLanguage: Object.values(localeLabels).map((label) => label.label),
          }
        : undefined,
      contact.whatsappNumber
        ? {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            telephone: `+${contact.whatsappNumber}`,
            contactOption: 'TollFree',
            url: `https://wa.me/${contact.whatsappNumber}`,
          }
        : undefined,
    ]),
    sameAs: socialLinks.map((link) => link.url),
  })
}

/** The site as a whole, linked back to the business that publishes it. */
export const websiteNode = (settings: SiteSettingsVM, locale: Locale): JsonLdNode =>
  compact({
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: pageUrl(locale),
    name: settings.brandName,
    description: settings.defaultSeo.description,
    inLanguage: localeLabels[locale].hreflang,
    publisher: { '@id': ORGANIZATION_ID },
  })

/**
 * Breadcrumbs. Worth emitting even though the design shows no visible breadcrumb
 * trail: this is how an engine learns that a tour belongs under "Day tours" rather
 * than sitting loose at the root.
 */
export const breadcrumbNode = (
  locale: Locale,
  trail: Array<{ name: string; path: string }>,
): JsonLdNode => ({
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((crumb, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: crumb.name,
    item: pageUrl(locale, crumb.path),
  })),
})

const offerNode = (price: number | null, url: string): JsonLdNode | undefined =>
  price && price > 0
    ? compact({
        '@type': 'Offer',
        // Prices are authored in USD and converted for display only, so USD is the
        // honest currency to declare here.
        price: String(price),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url,
      })
    : undefined

/** A tour or multi-day experience. */
export const tourNode = (tour: TourDetailVM, locale: Locale, path: string): JsonLdNode => {
  const url = pageUrl(locale, `${path}/${tour.slug}`)
  const price = tour.pricePerPerson ?? tour.basePricePerPerson

  return compact({
    '@type': 'TouristTrip',
    '@id': `${url}#trip`,
    name: tour.title,
    description: tour.shortDescription,
    url,
    image: [imageUrl(tour.heroImage), ...tour.gallery.map((item) => imageUrl(item.image))],
    inLanguage: localeLabels[locale].hreflang,
    provider: { '@id': ORGANIZATION_ID },
    touristType: tour.difficulty,
    // Only days that actually say something. A list of bare positions with no names
    // is not an itinerary — it asserts structure an engine cannot use.
    itinerary: (() => {
      const days = tour.itinerary.filter((day) => day.dayTitle)
      return days.length
        ? {
            '@type': 'ItemList',
            numberOfItems: days.length,
            itemListElement: days.map((day) => ({
              '@type': 'ListItem',
              position: day.dayNumber,
              name: day.dayTitle,
              description: day.dayDescription,
            })),
          }
        : undefined
    })(),
    // ISO 8601 duration. Daily tours carry hours, experiences carry days.
    ...(tour.durationHours
      ? { duration: `PT${tour.durationHours}H` }
      : tour.durationDays
        ? { duration: `P${tour.durationDays}D` }
        : {}),
    maximumAttendeeCapacity: tour.groupSizeMax ?? undefined,
    offers: offerNode(price, url),
    /**
     * `reviewCount` is required alongside `ratingValue` for a rating to be eligible
     * for rich results, and the CMS stores a bare editorial rating with no review
     * count behind it. Emitting an invented count would be fabricating a review
     * corpus, so the rating is omitted until real reviews are modelled.
     */
  })
}

/** A hotel. `Hotel` is a `LodgingBusiness`, which is what carries star ratings. */
export const hotelNode = (hotel: HotelDetailVM, locale: Locale): JsonLdNode => {
  const url = pageUrl(locale, `/hotels/${hotel.slug}`)
  const cheapestRoom = hotel.roomTypes
    .flatMap((room) => [room.pricing.singlePrice, room.pricing.doublePrice])
    .filter((price): price is number => typeof price === 'number' && price > 0)
    .sort((a, b) => a - b)[0]

  return compact({
    '@type': 'Hotel',
    '@id': `${url}#hotel`,
    name: hotel.name,
    url,
    image: [imageUrl(hotel.heroImage), ...hotel.gallery.map((item) => imageUrl(item.image))],
    address: hotel.address
      ? { '@type': 'PostalAddress', streetAddress: hotel.address, addressCountry: 'EG' }
      : undefined,
    starRating: hotel.starRating
      ? { '@type': 'Rating', ratingValue: hotel.starRating, bestRating: 5 }
      : undefined,
    amenityFeature: hotel.amenities.map((amenity) => ({
      '@type': 'LocationFeatureSpecification',
      name: amenity,
      value: true,
    })),
    checkinTime: hotel.checkInTime,
    checkoutTime: hotel.checkOutTime,
    numberOfRooms: hotel.roomTypes.length || undefined,
    makesOffer: offerNode(cheapestRoom ?? null, url),
  })
}

/**
 * A listing page as an ordered list. This is what lets an engine answer "what day
 * tours does Imperial Tours run" from the listing alone, without crawling every
 * detail page first.
 */
export const itemListNode = (
  items: ServiceCardVM[],
  locale: Locale,
  basePath: string,
  name: string,
): JsonLdNode =>
  compact({
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.title,
      url: pageUrl(locale, `${basePath}/${item.slug}`),
    })),
  })
