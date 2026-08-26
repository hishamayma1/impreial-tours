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

export type PaginatedVM<T> = {
  items: T[]
  page: number
  totalPages: number
  totalDocs: number
}

export type TourDetailVM = {
  id: string
  slug: string
  tourType: 'daily' | 'experience'
  title: string
  shortDescription: string
  overview: unknown
  heroImage: ImageVM | null
  gallery: Array<{ image: ImageVM | null; caption: string }>
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
}

export type HotelDetailVM = {
  id: string
  slug: string
  name: string
  description: unknown
  heroImage: ImageVM | null
  gallery: Array<{ image: ImageVM | null; caption: string }>
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
}

export type VehiclePriceVM = {
  vehicleClass: string
  maxPassengers: number | null
  maxLuggage: number | null
  price: number
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
  zones: Array<{ zoneName: string; areas: string[]; vehiclePricing: VehiclePriceVM[] }>
  routes: Array<{
    fromCity: string
    toCity: string
    distanceKm: number | null
    estimatedDurationMin: number | null
    oneWayOnly: boolean
    vehiclePricing: VehiclePriceVM[]
  }>
}

export type BicycleDetailVM = {
  id: string
  slug: string
  bikeType: 'rental' | 'tour'
  title: string
  description: string
  image: ImageVM | null
  gallery: Array<ImageVM | null>
  // rental
  bikeModel: string
  specs: { frameSize: string; gears: number | null; electric: boolean; weightKg: number | null }
  rentalPricing: Array<{ durationLabel: string; durationHours: number; price: number }>
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
}

/** Maps each locale to that language's slug for the same document. */
export type AlternateSlugs = Partial<Record<Locale, string>>
