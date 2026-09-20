/**
 * The offline dataset.
 *
 * `cached()` in services.ts catches every read failure — Mongo unreachable, a bad
 * `DATABASE_URI`, the cluster mid-failover — and serves a fallback instead of letting
 * the page 500. Before this file, that fallback was an empty page: the site stayed up
 * but every listing and detail route looked broken. This is a small, hand-authored
 * catalogue in the same view-model shapes the real Payload reads produce, so an outage
 * degrades to "showing yesterday's brochure" instead of "showing nothing".
 *
 * Deliberately NOT tagged 'server-only': the plain data and lookup helpers below are
 * imported by tests/fallback-data.test.ts directly, with no Next.js/React runtime.
 *
 * None of this is real inventory. Slugs are namespaced `offline-*` so they can never
 * collide with a real CMS document, and nothing here is ever written to Mongo.
 */

import type { ImageVM, OfferVM, NavSpotlightItemVM } from '@/types/content'
import type {
  ServiceCardVM,
  CatalogTourVM,
  SpotlightTourVM,
  TourDetailVM,
  HotelDetailVM,
  TransferDetailVM,
  BicycleDetailVM,
  BicycleCardVM,
  PaginatedVM,
} from '@/types/services'

const img = (file: string, alt: string, width: number, height: number): ImageVM => ({
  url: `/media/${file}`,
  alt,
  width,
  height,
})

const card = (file: string, alt: string): ImageVM => img(file, alt, 768, 576)
const hero = (file: string, alt: string): ImageVM => img(file, alt, 1200, 630)

const page = <T>(items: T[]): PaginatedVM<T> => ({
  items,
  page: 1,
  totalPages: 1,
  totalDocs: items.length,
})

// ---------------------------------------------------------------------------
// Tours
// ---------------------------------------------------------------------------

export const FALLBACK_TOURS: TourDetailVM[] = [
  {
    id: 'offline-tour-giza',
    slug: 'offline-pyramids-of-giza-half-day',
    tourType: 'daily',
    title: 'Pyramids of Giza & the Sphinx — Half Day',
    shortDescription: 'A half-day guided tour of the Great Pyramids, the Sphinx and a camel ride.',
    overview: null,
    heroImage: hero('serviceMuseum-1-1200x630.jpg', 'The Pyramids of Giza at sunrise'),
    gallery: [
      { image: card('serviceMuseum-1-768x576.jpg', 'The Pyramids of Giza'), full: hero('serviceMuseum-1-1200x630.jpg', 'The Pyramids of Giza'), caption: 'The Great Pyramids' },
    ],
    highlights: ['Great Pyramid of Khufu', 'The Great Sphinx', 'Camel ride on the plateau'],
    included: ['Egyptologist guide', 'Air-conditioned vehicle', 'Hotel pickup and drop-off'],
    notIncluded: ['Entry to the pyramid interior', 'Camel ride tip'],
    meetingPoint: 'Hotel lobby, Cairo/Giza',
    difficulty: 'easy',
    groupSizeMax: 12,
    rating: 4.8,
    badge: 'bestseller',
    languages: ['en', 'es'],
    durationHours: 5,
    startTimes: ['08:00', '13:00'],
    pricePerPerson: 65,
    childPrice: 35,
    instantConfirmation: true,
    durationDays: null,
    nights: null,
    itinerary: [],
    basePricePerPerson: null,
    singleSupplement: null,
    priceTiers: [],
    cancellationPolicy: null,
  },
  {
    id: 'offline-tour-museum',
    slug: 'offline-egyptian-museum-full-day',
    tourType: 'daily',
    title: 'Egyptian Museum & Old Cairo — Full Day',
    shortDescription: 'A full day tour through the Egyptian Museum, Coptic Cairo and Khan el-Khalili.',
    overview: null,
    heroImage: hero('serviceCollage-1-1200x630.jpg', 'Artifacts inside the Egyptian Museum'),
    gallery: [
      { image: card('serviceCollage-1-768x576.jpg', 'Egyptian Museum hall'), full: hero('serviceCollage-1-1200x630.jpg', 'Egyptian Museum hall'), caption: 'Inside the museum' },
    ],
    highlights: ['Tutankhamun treasures', 'Hanging Church', 'Khan el-Khalili bazaar'],
    included: ['Egyptologist guide', 'Museum entry', 'Lunch at a local restaurant'],
    notIncluded: ['Gratuities', 'Personal purchases'],
    meetingPoint: 'Hotel lobby, Cairo',
    difficulty: 'easy',
    groupSizeMax: 10,
    rating: 4.6,
    badge: null,
    languages: ['en', 'de'],
    durationHours: 8,
    startTimes: ['09:00'],
    pricePerPerson: 75,
    childPrice: 40,
    instantConfirmation: true,
    durationDays: null,
    nights: null,
    itinerary: [],
    basePricePerPerson: null,
    singleSupplement: null,
    priceTiers: [],
    cancellationPolicy: null,
  },
  {
    id: 'offline-tour-nile-cruise',
    slug: 'offline-nile-cruise-luxor-aswan',
    tourType: 'experience',
    title: 'Luxor to Aswan Nile Cruise — 8 Days',
    shortDescription: 'An 8-day, 7-night Nile cruise between Luxor and Aswan, calling at the temples along the river.',
    overview: null,
    heroImage: hero('destLuxor-1-1200x630.jpg', 'A Nile cruise ship at sunset'),
    gallery: [
      { image: card('destLuxor-1-768x576.jpg', 'Luxor temple at dusk'), full: hero('destLuxor-1-1200x630.jpg', 'Luxor temple at dusk'), caption: 'Luxor Temple' },
      { image: card('destAswan-1-768x576.webp', 'Aswan on the Nile'), full: hero('destAswan-1-1200x630.webp', 'Aswan on the Nile'), caption: 'Aswan' },
    ],
    highlights: ['Valley of the Kings', 'Karnak Temple', 'Philae Temple, Aswan'],
    included: ['Full board on the cruise ship', 'All shore excursions', 'Egyptologist guide'],
    notIncluded: ['International flights', 'Visa fees'],
    meetingPoint: 'Luxor cruise terminal',
    difficulty: 'moderate',
    groupSizeMax: 24,
    rating: 4.9,
    badge: 'bestseller',
    languages: ['en', 'es', 'de'],
    durationHours: null,
    startTimes: [],
    pricePerPerson: null,
    childPrice: null,
    instantConfirmation: false,
    durationDays: 8,
    nights: 7,
    itinerary: [
      { dayNumber: 1, dayTitle: 'Embarkation in Luxor', dayDescription: 'Board the ship and visit Karnak and Luxor Temples.', meals: ['dinner'], accommodation: 'Cruise ship cabin', image: card('destLuxor-1-768x576.jpg', 'Karnak Temple columns') },
      { dayNumber: 2, dayTitle: 'Valley of the Kings', dayDescription: 'Cross to the West Bank for the Valley of the Kings and the Colossi of Memnon.', meals: ['breakfast', 'lunch', 'dinner'], accommodation: 'Cruise ship cabin', image: null },
    ],
    basePricePerPerson: 890,
    singleSupplement: 220,
    priceTiers: [
      { minPax: 1, maxPax: 1, pricePerPerson: 1100 },
      { minPax: 2, maxPax: 4, pricePerPerson: 890 },
      { minPax: 5, maxPax: 12, pricePerPerson: 790 },
    ],
    cancellationPolicy: null,
  },
  {
    id: 'offline-tour-desert-safari',
    slug: 'offline-western-desert-safari',
    tourType: 'experience',
    title: 'Western Desert & White Desert Safari — 4 Days',
    shortDescription: 'A 4-day, 3-night 4x4 safari through the Bahariya and White Desert, camping under the stars.',
    overview: null,
    heroImage: hero('journalDesert-1-1200x630.jpg', 'The White Desert at sunset'),
    gallery: [
      { image: card('journalDesert-1-768x576.jpg', 'Chalk formations, White Desert'), full: hero('journalDesert-1-1200x630.jpg', 'Chalk formations, White Desert'), caption: 'White Desert formations' },
    ],
    highlights: ['White Desert chalk formations', 'Black Desert', 'Desert camping under the stars'],
    included: ['4x4 transport', 'Camping equipment', 'All meals during the safari'],
    notIncluded: ['Sleeping bag rental', 'Alcoholic drinks'],
    meetingPoint: 'Bahariya Oasis checkpoint',
    difficulty: 'moderate',
    groupSizeMax: 8,
    rating: 4.7,
    badge: 'new',
    languages: ['en'],
    durationHours: null,
    startTimes: [],
    pricePerPerson: null,
    childPrice: null,
    instantConfirmation: false,
    durationDays: 4,
    nights: 3,
    itinerary: [
      { dayNumber: 1, dayTitle: 'Cairo to Bahariya', dayDescription: 'Drive to Bahariya Oasis and visit the hot springs.', meals: ['lunch', 'dinner'], accommodation: 'Desert camp', image: null },
    ],
    basePricePerPerson: 340,
    singleSupplement: 60,
    priceTiers: [{ minPax: 2, maxPax: 8, pricePerPerson: 340 }],
    cancellationPolicy: null,
  },
]

const priceFromOf = (t: TourDetailVM): number | null =>
  t.tourType === 'daily' ? t.pricePerPerson : t.basePricePerPerson

const tourFacts = (t: TourDetailVM) => {
  const meta: string[] = []
  if (t.tourType === 'daily' && t.durationHours) meta.push(`${t.durationHours}h`)
  if (t.tourType === 'experience' && t.durationDays) meta.push(`${t.durationDays}d`)
  if (t.difficulty) meta.push(t.difficulty)
  return meta
}

const toTourCard = (t: TourDetailVM): ServiceCardVM => ({
  id: t.id,
  slug: t.slug,
  title: t.title,
  summary: t.shortDescription,
  image: t.heroImage,
  priceFrom: priceFromOf(t),
  meta: tourFacts(t),
  badge: t.badge,
  rating: t.rating,
})

const toCatalogCard = (t: TourDetailVM): CatalogTourVM => ({
  ...toTourCard(t),
  tourType: t.tourType,
  href: `${t.tourType === 'experience' ? '/tours/experiences' : '/tours/daily'}/${t.slug}`,
})

const toSpotlightCard = (t: TourDetailVM, spotlight: 'new' | 'top'): SpotlightTourVM => ({
  ...toCatalogCard(t),
  spotlight,
})

/** Mirrors `PaginatedVM<CatalogTourVM>` from `getTourCatalog` — filters are ignored, this is a degraded read. */
export const fallbackTourCatalog = (..._args: unknown[]): PaginatedVM<CatalogTourVM> => page(FALLBACK_TOURS.map(toCatalogCard))

export const fallbackTourCounts = (..._args: unknown[]) => ({
  all: FALLBACK_TOURS.length,
  daily: FALLBACK_TOURS.filter((t) => t.tourType === 'daily').length,
  experience: FALLBACK_TOURS.filter((t) => t.tourType === 'experience').length,
})

export const fallbackTourPriceRange = (..._args: unknown[]) => {
  const prices = FALLBACK_TOURS.map(priceFromOf).filter((p): p is number => p !== null)
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

export const fallbackTourListing = (tourType: 'daily' | 'experience'): PaginatedVM<ServiceCardVM> =>
  page(FALLBACK_TOURS.filter((t) => t.tourType === tourType).map(toTourCard))

/** Mirrors the `{ new, top }` shape `getSpotlightTours` returns. */
export const fallbackSpotlightTours = (..._args: unknown[]): { new: SpotlightTourVM[]; top: SpotlightTourVM[] } => ({
  new: [toSpotlightCard(FALLBACK_TOURS[3], 'new')],
  top: [toSpotlightCard(FALLBACK_TOURS[2], 'top'), toSpotlightCard(FALLBACK_TOURS[0], 'top')],
})

export const fallbackTourOffers = (..._args: unknown[]): OfferVM[] => [
  {
    id: 'offline-offer-nile-cruise',
    title: FALLBACK_TOURS[2].title,
    href: `/tours/experiences/${FALLBACK_TOURS[2].slug}`,
    badges: [{ text: 'Limited offer', tone: 'solid' }],
    image: hero('offerLuxor-1-1200x630.jpg', 'Nile cruise offer'),
  },
  {
    id: 'offline-offer-desert-safari',
    title: FALLBACK_TOURS[3].title,
    href: `/tours/experiences/${FALLBACK_TOURS[3].slug}`,
    badges: [{ text: 'New', tone: 'glass' }],
    image: hero('offerSahara-1-1200x630.jpg', 'Desert safari offer'),
  },
]

export const findFallbackTour = (
  slug: string,
  tourType: 'daily' | 'experience',
): TourDetailVM | null =>
  FALLBACK_TOURS.find((t) => t.slug === slug && t.tourType === tourType) ?? null

// ---------------------------------------------------------------------------
// Hotels
// ---------------------------------------------------------------------------

export const FALLBACK_HOTELS: HotelDetailVM[] = [
  {
    id: 'offline-hotel-cairo',
    slug: 'offline-nile-view-suites-cairo',
    name: 'Nile View Suites, Cairo',
    description: null,
    heroImage: hero('serviceHotel-1-1200x630.jpg', 'Nile View Suites, Cairo'),
    gallery: [
      { image: card('serviceHotel-1-768x576.jpg', 'Hotel exterior'), full: hero('serviceHotel-1-1200x630.jpg', 'Hotel exterior'), caption: 'Nile-facing terrace' },
    ],
    starRating: 5,
    address: 'Corniche El Nil, Cairo, Egypt',
    amenities: ['wifi', 'pool', 'spa', 'breakfast', 'gym', 'airportShuttle'],
    checkInTime: '15:00',
    checkOutTime: '11:00',
    policies: null,
    roomTypes: [
      {
        id: 'offline-room-deluxe',
        roomName: 'Deluxe Nile View',
        roomDescription: 'A spacious room with a private balcony overlooking the Nile.',
        bedConfiguration: '1 king bed',
        maxOccupancy: 2,
        breakfastIncluded: true,
        refundable: true,
        inventory: 6,
        extraBedPrice: 25,
        images: [card('serviceHotel-1-768x576.jpg', 'Deluxe Nile View room')],
        pricing: { singlePrice: 140, doublePrice: 160, triplePrice: 195 },
      },
    ],
    seasonalRates: [{ label: 'Peak season', startDate: '2026-12-01', endDate: '2027-02-28', multiplier: 1.25 }],
    cancellationPolicy: null,
  },
  {
    id: 'offline-hotel-luxor',
    slug: 'offline-luxor-oasis-resort',
    name: 'Luxor Oasis Resort',
    description: null,
    heroImage: hero('serviceCollage-1-1200x630.jpg', 'Luxor Oasis Resort'),
    gallery: [
      { image: card('serviceCollage-1-768x576.jpg', 'Resort pool'), full: hero('serviceCollage-1-1200x630.jpg', 'Resort pool'), caption: 'Poolside' },
    ],
    starRating: 4,
    address: 'East Bank, Luxor, Egypt',
    amenities: ['wifi', 'pool', 'breakfast', 'restaurant', 'parking'],
    checkInTime: '14:00',
    checkOutTime: '12:00',
    policies: null,
    roomTypes: [
      {
        id: 'offline-room-garden',
        roomName: 'Garden View Room',
        roomDescription: 'A comfortable room facing the resort gardens.',
        bedConfiguration: '2 twin beds',
        maxOccupancy: 3,
        breakfastIncluded: true,
        refundable: false,
        inventory: 10,
        extraBedPrice: 15,
        images: [],
        pricing: { singlePrice: 60, doublePrice: 75, triplePrice: 95 },
      },
    ],
    seasonalRates: [],
    cancellationPolicy: null,
  },
]

const toHotelCard = (h: HotelDetailVM): ServiceCardVM => ({
  id: h.id,
  slug: h.slug,
  title: h.name,
  summary: h.address,
  image: h.heroImage,
  priceFrom: h.roomTypes[0]?.pricing.doublePrice ?? h.roomTypes[0]?.pricing.singlePrice ?? null,
  meta: h.amenities,
  rating: h.starRating,
})

export const fallbackHotelListing = (..._args: unknown[]): PaginatedVM<ServiceCardVM> => page(FALLBACK_HOTELS.map(toHotelCard))

export const fallbackHotelPriceRange = (..._args: unknown[]) => {
  const prices = FALLBACK_HOTELS.map((h) => toHotelCard(h).priceFrom).filter((p): p is number => p !== null)
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

export const fallbackSpotlightHotels = (..._args: unknown[]): NavSpotlightItemVM[] =>
  FALLBACK_HOTELS.map((h) => {
    const c = toHotelCard(h)
    return { id: c.id, href: `/hotels/${c.slug}`, title: c.title, image: c.image, priceFrom: c.priceFrom, rating: c.rating ?? null }
  })

export const findFallbackHotel = (slug: string): HotelDetailVM | null =>
  FALLBACK_HOTELS.find((h) => h.slug === slug) ?? null

// ---------------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------------

export const FALLBACK_TRANSFERS: Record<'airport' | 'intercity' | 'custom', TransferDetailVM> = {
  airport: {
    id: 'offline-transfer-airport',
    slug: 'offline-airport-transfer',
    transferType: 'airport',
    title: 'Airport Transfer',
    description: 'Private airport pickup and drop-off with meet-and-greet.',
    heroImage: hero('hero-1-1200x630.jpg', 'Airport transfer vehicle'),
    meetAndGreet: true,
    freeWaitingMinutes: 60,
    vehicles: [
      { className: 'Sedan', image: null, maxPassengers: 3, maxLuggage: 2, features: ['Air conditioning', 'Bottled water'] },
      { className: 'Van', image: null, maxPassengers: 8, maxLuggage: 8, features: ['Air conditioning', 'Extra luggage space'] },
    ],
    airports: [
      { id: 'offline-airport-cai', name: 'Cairo International Airport', code: 'CAI', city: 'Cairo', terminals: ['Terminal 2', 'Terminal 3'] },
    ],
    extras: [
      { id: 'offline-extra-childseat', label: 'Child seat', description: 'A child safety seat fitted to the vehicle.', price: 10, perPassenger: false },
    ],
    zones: [
      { id: 'offline-zone-downtown', zoneName: 'Downtown Cairo', areas: ['Downtown', 'Zamalek', 'Garden City'], vehiclePricing: [{ vehicleClass: 'Sedan', maxPassengers: 3, maxLuggage: 2, price: 35 }, { vehicleClass: 'Van', maxPassengers: 8, maxLuggage: 8, price: 55 }] },
    ],
    routes: [],
    cancellationPolicy: null,
  },
  intercity: {
    id: 'offline-transfer-intercity',
    slug: 'offline-intercity-transfer',
    transferType: 'intercity',
    title: 'Intercity Transfer',
    description: 'Private door-to-door transfers between Egyptian cities.',
    heroImage: hero('hero-1-1200x630.jpg', 'Intercity transfer vehicle'),
    meetAndGreet: false,
    freeWaitingMinutes: 15,
    vehicles: [
      { className: 'SUV', image: null, maxPassengers: 4, maxLuggage: 4, features: ['Air conditioning', 'Highway rated'] },
    ],
    airports: [],
    extras: [],
    zones: [],
    routes: [
      { id: 'offline-route-cairo-luxor', fromCity: 'Cairo', toCity: 'Luxor', distanceKm: 670, estimatedDurationMin: 480, oneWayOnly: false, note: 'Overnight stop recommended.', vehiclePricing: [{ vehicleClass: 'SUV', maxPassengers: 4, maxLuggage: 4, price: 220 }] },
    ],
    cancellationPolicy: null,
  },
  custom: {
    id: 'offline-transfer-custom',
    slug: 'offline-custom-transfer',
    transferType: 'custom',
    title: 'Custom Transfer',
    description: 'A private vehicle and driver for a route or itinerary of your choosing.',
    heroImage: hero('hero-1-1200x630.jpg', 'Custom transfer vehicle'),
    meetAndGreet: true,
    freeWaitingMinutes: 30,
    vehicles: [
      { className: 'Van', image: null, maxPassengers: 8, maxLuggage: 8, features: ['Air conditioning', 'Flexible routing'] },
    ],
    airports: [],
    extras: [],
    zones: [],
    routes: [],
    cancellationPolicy: null,
  },
}

export const findFallbackTransfer = (transferType: 'airport' | 'intercity' | 'custom'): TransferDetailVM | null =>
  FALLBACK_TRANSFERS[transferType] ?? null

// ---------------------------------------------------------------------------
// Bicycles
// ---------------------------------------------------------------------------

export const FALLBACK_BICYCLES: BicycleDetailVM[] = [
  {
    id: 'offline-bicycle-rental',
    slug: 'offline-city-cruiser-rental',
    bikeType: 'rental',
    title: 'City Cruiser Rental',
    description: 'A comfortable city bike, available by the hour or the day.',
    image: card('serviceBikes-1-768x576.jpg', 'City cruiser bicycle'),
    gallery: [card('serviceBikes-1-768x576.jpg', 'City cruiser bicycle')],
    category: 'city',
    bikeModel: 'Cruiser Classic',
    specs: { frameSize: 'M', gears: 7, electric: false, weightKg: 14, frameSizes: ['S', 'M', 'L'] },
    rentalPricing: [
      { durationLabel: '1 hour', durationHours: 1, price: 6, popular: false },
      { durationLabel: 'Half day', durationHours: 6, price: 22, popular: true },
      { durationLabel: 'Full day', durationHours: 12, price: 35, popular: false },
    ],
    pricing: {
      pricingMode: 'both',
      hourlyRate: 6,
      extraHourRate: 4,
      minHours: 1,
      maxHours: 48,
      hourStep: 1,
      deliveryFee: 5,
      weekendSurchargePct: 10,
    },
    pickupSlots: ['08:00', '10:00', '14:00'],
    deposit: 50,
    includedAccessories: ['Helmet', 'Lock'],
    inventory: 15,
    routeName: '',
    distanceKm: null,
    elevationGainM: null,
    difficulty: '',
    durationHours: null,
    pricePerPerson: null,
    minAge: null,
    maxGroupSize: null,
    guideIncluded: false,
    bikeIncluded: true,
    startTimes: [],
    routePlan: [],
    cancellationPolicy: null,
  },
  {
    id: 'offline-bicycle-tour',
    slug: 'offline-desert-oasis-cycling-tour',
    bikeType: 'tour',
    title: 'Desert Oasis Cycling Tour',
    description: 'A guided half-day ride along the edge of the Bahariya Oasis.',
    image: card('serviceBikes-1-768x576.jpg', 'Cyclists on a desert road'),
    gallery: [card('serviceBikes-1-768x576.jpg', 'Cyclists on a desert road')],
    category: 'touring',
    bikeModel: '',
    specs: { frameSize: '', gears: null, electric: false, weightKg: null, frameSizes: [] },
    rentalPricing: [],
    pricing: {
      pricingMode: 'hourly',
      hourlyRate: null,
      extraHourRate: null,
      minHours: 0,
      maxHours: 0,
      hourStep: 1,
      deliveryFee: null,
      weekendSurchargePct: null,
    },
    pickupSlots: ['07:00'],
    deposit: null,
    includedAccessories: [],
    inventory: null,
    routeName: 'Bahariya Oasis loop',
    distanceKm: 28,
    elevationGainM: 120,
    difficulty: 'moderate',
    durationHours: 4,
    pricePerPerson: 45,
    minAge: 12,
    maxGroupSize: 10,
    guideIncluded: true,
    bikeIncluded: true,
    startTimes: ['07:00'],
    routePlan: [
      { stopName: 'Oasis springs', stopDescription: 'A rest stop at the hot springs.', distanceFromStartKm: 10, image: null },
    ],
    cancellationPolicy: null,
  },
]

const toBicycleCard = (b: BicycleDetailVM): BicycleCardVM => ({
  id: b.id,
  slug: b.slug,
  title: b.title,
  summary: b.description,
  image: b.image,
  priceFrom: b.bikeType === 'rental' ? (b.rentalPricing[0]?.price ?? b.pricing.hourlyRate) : b.pricePerPerson,
  meta: [],
  bikeType: b.bikeType,
  category: b.category,
  electric: b.specs.electric,
  gears: b.specs.gears,
  frameSizes: b.specs.frameSizes,
  hourlyRate: b.pricing.hourlyRate,
  minHours: b.pricing.minHours || null,
  maxHours: b.pricing.maxHours || null,
  bands: b.rentalPricing.slice(0, 3),
  inventory: b.inventory,
  distanceKm: b.distanceKm,
  durationHours: b.durationHours,
  difficulty: b.difficulty,
  maxGroupSize: b.maxGroupSize,
})

export const fallbackBicycleListing = (..._args: unknown[]): PaginatedVM<BicycleCardVM> => page(FALLBACK_BICYCLES.map(toBicycleCard))

export const fallbackBicycleCounts = (..._args: unknown[]) => ({
  all: FALLBACK_BICYCLES.length,
  rental: FALLBACK_BICYCLES.filter((b) => b.bikeType === 'rental').length,
  tour: FALLBACK_BICYCLES.filter((b) => b.bikeType === 'tour').length,
})

export const fallbackBicyclePriceRange = (..._args: unknown[]) => {
  const prices = FALLBACK_BICYCLES.map((b) => toBicycleCard(b).priceFrom).filter((p): p is number => p !== null)
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

export const findFallbackBicycle = (slug: string): BicycleDetailVM | null =>
  FALLBACK_BICYCLES.find((b) => b.slug === slug) ?? null
