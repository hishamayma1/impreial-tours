import type { ImageVM } from './content'
import type { Locale } from '@/i18n/routing'

/**
 * One structured fact about a listing — a duration, a difficulty, a group size.
 *
 * Kept as {icon, value} pairs rather than a pre-joined string so each card design
 * decides how to present them: the daily-tour card renders an icon row, the
 * experience card renders a labelled stat block from the same data.
 */
export type CardFact = {
  icon: 'clock' | 'calendar' | 'signal' | 'users' | 'globe' | 'moon' | 'route'
  value: string
  /** Screen-reader label, since the icon alone carries no meaning. */
  label: string
}

/** Shared by every service card so one grid component can render any of them. */
export type ServiceCardVM = {
  id: string
  slug: string
  title: string
  summary: string
  image: ImageVM | null
  /** Pre-formatted "from" price, or null when the record carries no price. */
  priceFrom: number | null
  /** Legacy joined strings, still used by the hotel and bicycle cards. */
  meta: string[]
  /** Structured facts used by the redesigned tour and experience cards. */
  facts?: CardFact[]
  badge?: string | null
  rating?: number | null
}

/**
 * A tour shaped for the home page spotlight band.
 *
 * Carries its own `href` because the band mixes daily tours and multi-day
 * experiences in one grid: the card cannot derive `/tours/daily` from a single
 * `basePath` the way a listing grid can.
 *
 * `spotlight` is the reason the tour is in the band — 'new' for a recent addition,
 * 'top' for a highly-rated one — which the card prints as its ribbon. It is kept
 * separate from the CMS `badge` field so an editor's flag and the band's own
 * grouping can never contradict each other on the same card.
 */
export type SpotlightTourVM = ServiceCardVM & {
  href: string
  tourType: 'daily' | 'experience'
  spotlight: 'new' | 'top'
}

/**
 * A tour shaped for the combined `/tours` catalogue, which mixes daily tours and
 * multi-day experiences in one result set.
 *
 * It carries `href` and `tourType` for the same reason `SpotlightTourVM` does: the
 * grid cannot derive `/tours/daily` from a single `basePath` when the row beside it
 * is an experience. `tourType` is separate from the href so the card can label the
 * kind of journey without parsing a URL back apart.
 */
export type CatalogTourVM = ServiceCardVM & {
  href: string
  tourType: 'daily' | 'experience'
}

export type PaginatedVM<T> = {
  items: T[]
  page: number
  totalPages: number
  totalDocs: number
}

/**
 * One gallery entry, carried at two sizes.
 *
 * The grid renders the cropped card variant and the lightbox renders the full one —
 * see `galleryOf` in services.ts for why the thumbnail cannot simply be scaled up.
 */
export type GalleryItemVM = {
  image: ImageVM | null
  full: ImageVM | null
  caption: string
}

export type TourDetailVM = {
  id: string
  slug: string
  tourType: 'daily' | 'experience'
  title: string
  shortDescription: string
  overview: unknown
  heroImage: ImageVM | null
  gallery: GalleryItemVM[]
  highlights: string[]
  included: string[]
  notIncluded: string[]
  meetingPoint: string
  difficulty: string
  groupSizeMax: number | null
  rating: number | null
  badge: string | null
  languages: string[]
  // daily
  durationHours: number | null
  startTimes: string[]
  pricePerPerson: number | null
  childPrice: number | null
  instantConfirmation: boolean
  // experience
  durationDays: number | null
  nights: number | null
  itinerary: Array<{
    dayNumber: number
    dayTitle: string
    dayDescription: string
    meals: string[]
    accommodation: string
    image: ImageVM | null
  }>
  basePricePerPerson: number | null
  singleSupplement: number | null
  priceTiers: Array<{ minPax: number; maxPax: number; pricePerPerson: number }>
  cancellationPolicy: unknown
}

export type HotelDetailVM = {
  id: string
  slug: string
  name: string
  description: unknown
  heroImage: ImageVM | null
  gallery: GalleryItemVM[]
  starRating: number | null
  address: string
  amenities: string[]
  checkInTime: string
  checkOutTime: string
  policies: unknown
  roomTypes: Array<{
    id: string
    roomName: string
    roomDescription: string
    bedConfiguration: string
    maxOccupancy: number
    breakfastIncluded: boolean
    refundable: boolean
    inventory: number
    extraBedPrice: number | null
    images: Array<ImageVM | null>
    pricing: {
      singlePrice: number | null
      doublePrice: number | null
      triplePrice: number | null
    }
  }>
  seasonalRates: Array<{
    label: string
    startDate: string
    endDate: string
    multiplier: number
  }>
  cancellationPolicy: unknown
}

export type VehiclePriceVM = {
  vehicleClass: string
  maxPassengers: number | null
  maxLuggage: number | null
  price: number
}

/** One paid add-on on a transfer booking. */
export type TransferExtraVM = {
  id: string
  label: string
  description: string
  price: number
  /** Multiply by the passenger count rather than charging once per booking. */
  perPassenger: boolean
}

export type TransferDetailVM = {
  id: string
  slug: string
  transferType: 'airport' | 'intercity' | 'custom'
  title: string
  description: string
  heroImage: ImageVM | null
  meetAndGreet: boolean
  freeWaitingMinutes: number | null
  vehicles: Array<{
    className: string
    image: ImageVM | null
    maxPassengers: number | null
    maxLuggage: number | null
    features: string[]
  }>
  /** Airports this transfer serves, resolved from the Airports collection. */
  airports: Array<{
    id: string
    name: string
    code: string
    city: string
    terminals: string[]
  }>
  /** Editor-controlled paid add-ons, offered as checkboxes at booking time. */
  extras: TransferExtraVM[]
  /**
   * `id` is the array row's own id, and it is load-bearing rather than incidental:
   * the booking route prices from the zone or route the customer actually chose, and
   * without an identity to send it could only match on the vehicle-class name — which
   * is the same string in every zone.
   */
  zones: Array<{
    id: string
    zoneName: string
    areas: string[]
    vehiclePricing: VehiclePriceVM[]
  }>
  routes: Array<{
    id: string
    fromCity: string
    toCity: string
    distanceKm: number | null
    estimatedDurationMin: number | null
    oneWayOnly: boolean
    note: string
    vehiclePricing: VehiclePriceVM[]
  }>
  cancellationPolicy: unknown
}

/**
 * A bicycle shaped for the listing grid.
 *
 * Wider than `ServiceCardVM` because the listing shows two products side by side: a
 * rental, whose headline fact is what an hour costs and how long you may keep it, and
 * a guided ride, whose headline facts are distance and difficulty. The card branches
 * on `bikeType` and reads only the half that applies, rather than both being flattened
 * into the generic `meta` strings — which is what stopped the old card from being able
 * to say anything specific about either.
 */
export type BicycleCardVM = ServiceCardVM & {
  bikeType: 'rental' | 'tour'
  category: string
  electric: boolean
  gears: number | null
  frameSizes: string[]
  // rental
  hourlyRate: number | null
  minHours: number | null
  maxHours: number | null
  /** The first few duration packages, for the price ladder printed on the card. */
  bands: RentalBandVM[]
  inventory: number | null
  // guided ride
  distanceKm: number | null
  durationHours: number | null
  difficulty: string
  maxGroupSize: number | null
}

/** One duration package as authored in the CMS. */
export type RentalBandVM = {
  durationLabel: string
  durationHours: number
  price: number
  popular?: boolean
  note?: string
}

export type BicycleDetailVM = {
  id: string
  slug: string
  bikeType: 'rental' | 'tour'
  title: string
  description: string
  image: ImageVM | null
  gallery: Array<ImageVM | null>
  category: string
  // rental
  bikeModel: string
  specs: {
    frameSize: string
    gears: number | null
    electric: boolean
    weightKg: number | null
    frameSizes: string[]
  }
  rentalPricing: RentalBandVM[]
  /**
   * The time-pricing rules, exactly as the dashboard holds them.
   *
   * Passed to the planner whole rather than as a pre-computed price list: the visitor
   * can ask for any duration on the editor's step, and enumerating every one of those
   * on the server would ship a table to express what four numbers already do.
   */
  pricing: {
    pricingMode: 'both' | 'bands' | 'hourly'
    hourlyRate: number | null
    extraHourRate: number | null
    minHours: number
    maxHours: number
    hourStep: number
    deliveryFee: number | null
    weekendSurchargePct: number | null
  }
  pickupSlots: string[]
  deposit: number | null
  includedAccessories: string[]
  inventory: number | null
  // tour
  routeName: string
  distanceKm: number | null
  elevationGainM: number | null
  difficulty: string
  durationHours: number | null
  pricePerPerson: number | null
  minAge: number | null
  maxGroupSize: number | null
  guideIncluded: boolean
  bikeIncluded: boolean
  startTimes: string[]
  routePlan: Array<{
    stopName: string
    stopDescription: string
    distanceFromStartKm: number | null
    image: ImageVM | null
  }>
  cancellationPolicy: unknown
}

/** Maps each locale to that language's slug for the same document. */
export type AlternateSlugs = Partial<Record<Locale, string>>
