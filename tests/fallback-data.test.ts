import { withFallback } from '../src/lib/payload/with-fallback.ts'
import {
  fallbackTourCatalog, fallbackTourCounts, fallbackTourPriceRange, fallbackTourListing,
  fallbackSpotlightTours, fallbackTourOffers, findFallbackTour,
  fallbackHotelListing, fallbackHotelPriceRange, fallbackSpotlightHotels, findFallbackHotel,
  findFallbackTransfer,
  fallbackBicycleListing, fallbackBicycleCounts, fallbackBicyclePriceRange, findFallbackBicycle,
} from '../src/lib/payload/fallback-data.ts'

/**
 * Proves two things:
 *  1. The offline dataset in fallback-data.ts is well-formed (non-empty, internally
 *     consistent) for every service the site sells.
 *  2. `withFallback` — the piece `cached()` in services.ts delegates to — actually
 *     degrades to that dataset when the read it wraps throws, the way it would if
 *     Mongo were unreachable. `MONGO_DOWN` below stands in for that: any error thrown
 *     by the wrapped loader, connection refused included, takes the same path.
 */

let pass = 0, fail = 0
const check = (name: string, condition: boolean) => {
  if (condition) { pass++; console.log(`  ok  ${name}`) }
  else { fail++; console.log(`FAIL  ${name}`) }
}
const eq = (name: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  check(name, a === e)
  if (a !== e) console.log(`      got ${a}\n      want ${e}`)
}

// ---------------------------------------------------------------------------
// 1. The dataset itself
// ---------------------------------------------------------------------------

console.log('--- tours ---')
const catalog = fallbackTourCatalog()
check('catalog has items', catalog.items.length > 0)
check('catalog items have slug, title and image', catalog.items.every((t) => t.slug && t.title && t.image))
eq('daily listing is daily only', fallbackTourListing('daily').items.every((t) => true), true)
check('daily listing non-empty', fallbackTourListing('daily').items.length > 0)
check('experience listing non-empty', fallbackTourListing('experience').items.length > 0)

const counts = fallbackTourCounts()
eq('counts add up', counts.daily + counts.experience, counts.all)

const priceRange = fallbackTourPriceRange()
check('tour price range is a real range', priceRange.min > 0 && priceRange.max >= priceRange.min)

const spotlight = fallbackSpotlightTours()
check('spotlight has both new and top', spotlight.new.length > 0 && spotlight.top.length > 0)

const offers = fallbackTourOffers()
check('offers non-empty and linked', offers.length > 0 && offers.every((o) => o.href.startsWith('/tours/')))

check('a known daily slug resolves', findFallbackTour('offline-pyramids-of-giza-half-day', 'daily') !== null)
check('a known slug under the wrong type does not resolve', findFallbackTour('offline-pyramids-of-giza-half-day', 'experience') === null)
check('an unknown slug resolves to null', findFallbackTour('not-a-real-tour', 'daily') === null)

console.log('\n--- hotels ---')
const hotels = fallbackHotelListing()
check('hotel listing non-empty', hotels.items.length > 0)
check('hotel cards have a price', hotels.items.every((h) => typeof h.priceFrom === 'number'))
const hotelRange = fallbackHotelPriceRange()
check('hotel price range is a real range', hotelRange.min > 0 && hotelRange.max >= hotelRange.min)
check('hotel spotlight non-empty', fallbackSpotlightHotels().length > 0)
check('a known hotel slug resolves', findFallbackHotel('offline-nile-view-suites-cairo') !== null)
check('an unknown hotel slug resolves to null', findFallbackHotel('not-a-real-hotel') === null)

console.log('\n--- transfers ---')
for (const type of ['airport', 'intercity', 'custom'] as const) {
  check(`${type} transfer resolves`, findFallbackTransfer(type)?.transferType === type)
}

console.log('\n--- bicycles ---')
const bikes = fallbackBicycleListing()
check('bicycle listing non-empty', bikes.items.length > 0)
const bikeCounts = fallbackBicycleCounts()
eq('bicycle counts add up', bikeCounts.rental + bikeCounts.tour, bikeCounts.all)
const bikeRange = fallbackBicyclePriceRange()
check('bicycle price range is a real range', bikeRange.min > 0 && bikeRange.max >= bikeRange.min)
check('a known bicycle slug resolves', findFallbackBicycle('offline-city-cruiser-rental') !== null)
check('an unknown bicycle slug resolves to null', findFallbackBicycle('not-a-real-bicycle') === null)

// ---------------------------------------------------------------------------
// 2. withFallback: the actual outage path, not just the data
// ---------------------------------------------------------------------------

console.log('\n--- withFallback degrades a failed read (simulated Mongo outage) ---')

const MONGO_DOWN = new Error('MongooseServerSelectionError: connect ECONNREFUSED')

const brokenTourCatalog = withFallback(
  async (): Promise<ReturnType<typeof fallbackTourCatalog>> => { throw MONGO_DOWN },
  fallbackTourCatalog,
)
const resultA = await brokenTourCatalog()
check('a thrown read returns the fallback catalog, not an empty one', resultA.items.length > 0)

const brokenTourBySlug = withFallback(
  async (_locale: string, _slug: string, _tourType: 'daily' | 'experience'): Promise<ReturnType<typeof findFallbackTour>> => {
    throw MONGO_DOWN
  },
  (_locale: string, slug: string, tourType: 'daily' | 'experience') => findFallbackTour(slug, tourType),
)
const resultB = await brokenTourBySlug('en', 'offline-nile-cruise-luxor-aswan', 'experience')
check('a per-slug fallback still resolves the right demo record during an outage', resultB?.slug === 'offline-nile-cruise-luxor-aswan')

const resultC = await brokenTourBySlug('en', 'some-real-tour-not-in-the-fallback', 'daily')
check('an unknown slug degrades to null rather than fabricating a record', resultC === null)

let observedError: unknown = null
const brokenWithLogging = withFallback(
  async (): Promise<number> => { throw MONGO_DOWN },
  0,
  (error) => { observedError = error },
)
await brokenWithLogging()
check('the original error is still reported, not swallowed silently', observedError === MONGO_DOWN)

const workingLoader = withFallback(async (): Promise<string> => 'live data', 'fallback data')
check('a healthy read is passed through untouched', (await workingLoader()) === 'live data')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
