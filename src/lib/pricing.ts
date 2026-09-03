/**
 * Server-side pricing. Everything the customer is charged is computed here and
 * nowhere else — the Zustand store's running total is display-only, so a tampered
 * client payload can never set its own price.
 *
 * All inputs are structural rather than Payload's generated types, so these functions
 * stay unit-testable without a database and can be called from hooks, route handlers
 * and server components alike.
 */

import { quoteRental, toPricingConfig } from './rental-pricing.ts'

export type Occupancy = 'single' | 'double' | 'triple'

const round2 = (n: number): number => Math.round(n * 100) / 100

/** Treats null/undefined/NaN as 0 so a half-filled CMS record can never yield NaN. */
const num = (value: unknown): number => {
  const n = typeof value === 'string' ? Number(value) : (value as number)
  return typeof n === 'number' && Number.isFinite(n) ? n : 0
}

const toTime = (value: string | Date | null | undefined): number | null => {
  if (!value) return null
  const t = value instanceof Date ? value.getTime() : Date.parse(value)
  return Number.isNaN(t) ? null : t
}

// ---------------------------------------------------------------------------
// Hotels
// ---------------------------------------------------------------------------

export type SeasonalRate = {
  label?: string
  startDate?: string | Date | null
  endDate?: string | Date | null
  multiplier?: number | null
}

export type RoomTypeInput = {
  id?: string
  roomName?: string
  maxOccupancy?: number | null
  extraBedPrice?: number | null
  pricing?: {
    singlePrice?: number | null
    doublePrice?: number | null
    triplePrice?: number | null
  } | null
}

export type RoomSelection = {
  roomTypeId: string
  occupancy: Occupancy
  /** Guests actually sleeping in this room. Defaults to the occupancy's headcount. */
  guests?: number
  /** How many rooms of this type, at this occupancy. */
  quantity?: number
}

const OCCUPANCY_HEADCOUNT: Record<Occupancy, number> = { single: 1, double: 2, triple: 3 }

const perPersonRate = (room: RoomTypeInput, occupancy: Occupancy): number => {
  const p = room.pricing ?? {}
  if (occupancy === 'single') return num(p.singlePrice)
  if (occupancy === 'double') return num(p.doublePrice)
  return num(p.triplePrice)
}

/**
 * The multiplier for a stay. A stay that straddles two seasons takes the FIRST
 * matching window by check-in date — simple, predictable, and what a front-desk quote
 * would do. Missing or zero multipliers fall back to 1 rather than zeroing the bill.
 */
export const resolveSeasonMultiplier = (
  seasons: SeasonalRate[] | null | undefined,
  checkIn: string | Date | null | undefined,
): number => {
  const at = toTime(checkIn)
  if (!at || !seasons?.length) return 1

  for (const season of seasons) {
    const start = toTime(season.startDate)
    const end = toTime(season.endDate)
    if (start === null || end === null) continue
    if (at >= start && at <= end) {
      const m = num(season.multiplier)
      return m > 0 ? m : 1
    }
  }
  return 1
}

/** Whole nights between two dates. Same-day or reversed ranges count as one night. */
export const nightsBetween = (
  checkIn: string | Date | null | undefined,
  checkOut: string | Date | null | undefined,
): number => {
  const a = toTime(checkIn)
  const b = toTime(checkOut)
  if (a === null || b === null) return 0
  const nights = Math.round((b - a) / 86_400_000)
  return nights > 0 ? nights : 1
}

export type HotelTotalInput = {
  roomTypes: RoomTypeInput[]
  selections: RoomSelection[]
  checkIn?: string | Date | null
  checkOut?: string | Date | null
  /** Overrides the date-derived night count when the caller already knows it. */
  nights?: number
  seasonalRates?: SeasonalRate[] | null
}

export type PriceLine = {
  label: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export type PriceBreakdown = {
  lines: PriceLine[]
  subtotal: number
}

/**
 * Section 3's formula:
 *   total = Σ over rooms( occupancyPrice × guestsInRoom × nights × seasonMultiplier )
 *
 * `occupancyPrice` is per person per night, so guests in the room is a real multiplier
 * rather than a divisor. Guests beyond the occupancy band are billed at extraBedPrice.
 */
export const calculateHotelTotal = ({
  roomTypes,
  selections,
  checkIn,
  checkOut,
  nights,
  seasonalRates,
}: HotelTotalInput): PriceBreakdown => {
  const stayNights = nights && nights > 0 ? nights : nightsBetween(checkIn, checkOut)
  const multiplier = resolveSeasonMultiplier(seasonalRates, checkIn)
  const lines: PriceLine[] = []

  for (const selection of selections) {
    const room = roomTypes.find((r) => r.id === selection.roomTypeId)
    if (!room) continue

    const quantity = Math.max(1, selection.quantity ?? 1)
    const band = OCCUPANCY_HEADCOUNT[selection.occupancy]
    const guests = Math.max(1, selection.guests ?? band)
    const billedAtBand = Math.min(guests, band)
    const extraGuests = Math.max(0, guests - band)

    const rate = perPersonRate(room, selection.occupancy)
    const perRoom =
      rate * billedAtBand * stayNights * multiplier +
      num(room.extraBedPrice) * extraGuests * stayNights * multiplier

    lines.push({
      label: `${room.roomName ?? 'Room'} — ${selection.occupancy}`,
      quantity,
      unitPrice: round2(perRoom),
      subtotal: round2(perRoom * quantity),
    })
  }

  return { lines, subtotal: round2(lines.reduce((sum, l) => sum + l.subtotal, 0)) }
}

// ---------------------------------------------------------------------------
// Tours
// ---------------------------------------------------------------------------

export type PriceTier = {
  minPax?: number | null
  maxPax?: number | null
  pricePerPerson?: number | null
}

/** The tier whose band contains `pax`. Falls back to the base price when none match. */
export const resolveTierPrice = (
  tiers: PriceTier[] | null | undefined,
  pax: number,
  basePrice: number,
): number => {
  if (!tiers?.length) return basePrice
  for (const tier of tiers) {
    const min = num(tier.minPax)
    const max = num(tier.maxPax)
    if (pax >= min && (max === 0 || pax <= max)) return num(tier.pricePerPerson)
  }
  return basePrice
}

export type DailyTourInput = {
  pricePerPerson?: number | null
  childPrice?: number | null
  privateGroupPrice?: number | null
}

export const calculateDailyTourTotal = ({
  tour,
  adults,
  children = 0,
  privateGroup = false,
}: {
  tour: DailyTourInput
  adults: number
  children?: number
  /** Books the whole tour at a flat rate instead of per head. */
  privateGroup?: boolean
}): PriceBreakdown => {
  if (privateGroup && num(tour.privateGroupPrice) > 0) {
    const price = round2(num(tour.privateGroupPrice))
    return {
      lines: [{ label: 'Private group', quantity: 1, unitPrice: price, subtotal: price }],
      subtotal: price,
    }
  }

  const lines: PriceLine[] = []
  const adultRate = num(tour.pricePerPerson)
  // Infants are free and are deliberately not billed anywhere in this function.
  if (adults > 0) {
    lines.push({
      label: 'Adults',
      quantity: adults,
      unitPrice: round2(adultRate),
      subtotal: round2(adultRate * adults),
    })
  }
  if (children > 0) {
    // Falls back to the adult rate when no child price is configured.
    const childRate = num(tour.childPrice) || adultRate
    lines.push({
      label: 'Children',
      quantity: children,
      unitPrice: round2(childRate),
      subtotal: round2(childRate * children),
    })
  }

  return { lines, subtotal: round2(lines.reduce((s, l) => s + l.subtotal, 0)) }
}

export type ExperienceInput = {
  pricing?: {
    basePricePerPerson?: number | null
    singleSupplement?: number | null
    priceTiers?: PriceTier[] | null
  } | null
  departureDates?: Array<{
    date?: string | Date | null
    priceOverride?: number | null
  }> | null
}

/**
 * Group size drives the per-head rate, so the tier is resolved from total travellers
 * and then applied to each of them. A departure-specific override beats the tier.
 */
export const calculateExperienceTotal = ({
  experience,
  travellers,
  singleRooms = 0,
  departureDate,
}: {
  experience: ExperienceInput
  travellers: number
  /** Travellers who will not share a room, each paying the single supplement. */
  singleRooms?: number
  departureDate?: string | Date | null
}): PriceBreakdown => {
  const pricing = experience.pricing ?? {}
  const base = num(pricing.basePricePerPerson)

  const override = (() => {
    const at = toTime(departureDate)
    if (!at || !experience.departureDates?.length) return 0
    const match = experience.departureDates.find((d) => toTime(d.date) === at)
    return num(match?.priceOverride)
  })()

  const perPerson = override > 0 ? override : resolveTierPrice(pricing.priceTiers, travellers, base)

  const lines: PriceLine[] = [
    {
      label: 'Travellers',
      quantity: travellers,
      unitPrice: round2(perPerson),
      subtotal: round2(perPerson * travellers),
    },
  ]

  const supplement = num(pricing.singleSupplement)
  if (singleRooms > 0 && supplement > 0) {
    lines.push({
      label: 'Single supplement',
      quantity: singleRooms,
      unitPrice: round2(supplement),
      subtotal: round2(supplement * singleRooms),
    })
  }

  return { lines, subtotal: round2(lines.reduce((s, l) => s + l.subtotal, 0)) }
}

// ---------------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------------

export type VehiclePrice = {
  vehicleClass?: string
  maxPassengers?: number | null
  price?: number | null
}

export type TransferExtra = {
  id?: string
  label?: string
  price?: number | null
  perPassenger?: boolean | null
}

/**
 * Prices the chosen add-ons.
 *
 * Selection arrives as a list of row ids and every figure is read back out of the CMS
 * rows, so a request naming an extra that does not exist — or naming one at a price of
 * its own choosing — contributes nothing. Ids are de-duplicated first: the same extra
 * sent twice is one extra, not a double charge.
 */
export const calculateExtrasTotal = ({
  extras,
  selectedIds,
  passengers = 1,
}: {
  extras: TransferExtra[]
  selectedIds: string[]
  passengers?: number
}): PriceBreakdown => {
  const wanted = new Set(selectedIds)
  const lines: PriceLine[] = []

  for (const extra of extras) {
    if (!extra.id || !wanted.has(extra.id)) continue

    const unitPrice = round2(num(extra.price))
    if (unitPrice <= 0) continue

    const quantity = extra.perPassenger ? Math.max(1, passengers) : 1
    lines.push({
      label: String(extra.label ?? ''),
      quantity,
      unitPrice,
      subtotal: round2(unitPrice * quantity),
    })
  }

  return { lines, subtotal: round2(lines.reduce((sum, line) => sum + line.subtotal, 0)) }
}

export const calculateTransferTotal = ({
  vehiclePricing,
  vehicleClass,
  roundTrip = false,
  vehicles = 1,
}: {
  vehiclePricing: VehiclePrice[]
  vehicleClass: string
  roundTrip?: boolean
  vehicles?: number
}): PriceBreakdown => {
  const match = vehiclePricing.find((v) => v.vehicleClass === vehicleClass)
  if (!match) return { lines: [], subtotal: 0 }

  const legs = roundTrip ? 2 : 1
  const quantity = Math.max(1, vehicles) * legs
  const unitPrice = round2(num(match.price))

  return {
    lines: [
      {
        label: `${match.vehicleClass}${roundTrip ? ' (round trip)' : ''}`,
        quantity,
        unitPrice,
        subtotal: round2(unitPrice * quantity),
      },
    ],
    subtotal: round2(unitPrice * quantity),
  }
}

// ---------------------------------------------------------------------------
// Bicycles
// ---------------------------------------------------------------------------

export type RentalBand = {
  durationLabel?: string
  durationHours?: number | null
  price?: number | null
}

/**
 * Prices a rental for the requested number of hours.
 *
 * The maths itself lives in lib/rental-pricing.ts and is shared verbatim with the
 * planner on the bicycle page. That sharing is the whole point: the planner shows the
 * visitor a figure before they commit, and this function decides what they are
 * actually charged. Two implementations of "cheapest way to N hours" would eventually
 * disagree, and the first anyone would hear of it is a customer whose total went up at
 * the last step.
 *
 * The optional pricing fields are what the shared engine adds over the old bands-only
 * lookup — an hourly rate, an overtime rate, weekend and delivery charges. Called with
 * bands alone it behaves exactly as it did before.
 */
export const calculateBicycleRentalTotal = ({
  bands,
  hours,
  quantity = 1,
  pricingMode,
  hourlyRate,
  extraHourRate,
  minHours,
  maxHours,
  hourStep,
  deliveryFee,
  weekendSurchargePct,
  weekend,
  delivery,
}: {
  bands: RentalBand[]
  hours: number
  quantity?: number
  pricingMode?: string | null
  hourlyRate?: number | null
  extraHourRate?: number | null
  minHours?: number | null
  maxHours?: number | null
  hourStep?: number | null
  deliveryFee?: number | null
  weekendSurchargePct?: number | null
  weekend?: boolean
  delivery?: boolean
}): PriceBreakdown => {
  if (hours <= 0) return { lines: [], subtotal: 0 }

  const config = toPricingConfig({
    pricingMode,
    hourlyRate,
    extraHourRate,
    minHours,
    maxHours,
    hourStep,
    deliveryFee,
    weekendSurchargePct,
    bands: bands
      .filter((b) => num(b.durationHours) > 0 && num(b.price) > 0)
      .map((b) => ({
        durationLabel: b.durationLabel ?? `${num(b.durationHours)}h`,
        durationHours: num(b.durationHours),
        price: num(b.price),
      })),
  })

  const quote = quoteRental(config, { hours, quantity, weekend, delivery }, { clamp: false })
  if (!quote.basis) return { lines: [], subtotal: 0 }

  /** The line label names what was actually charged, not what was asked for. */
  const label = (() => {
    switch (quote.basis.kind) {
      case 'hourly':
        return `${quote.basis.hours}h`
      case 'band':
        return quote.basis.band.durationLabel
      case 'band-plus-hours':
        return `${quote.basis.band.durationLabel} + ${quote.basis.extraHours}h`
      case 'band-multiple':
        return quote.basis.band.durationLabel
    }
  })()

  // A repeated package is billed as N units of that package, so the invoice reads the
  // way the shop's own price list does rather than as one opaque sum.
  const units = quote.basis.kind === 'band-multiple' ? quote.basis.units : 1

  const lines: PriceLine[] = [
    {
      label,
      quantity: units * quote.quantity,
      unitPrice: round2(quote.unitPrice / units),
      subtotal: quote.subtotal,
    },
  ]

  if (quote.weekendSurcharge > 0) {
    lines.push({
      label: 'Weekend surcharge',
      quantity: 1,
      unitPrice: quote.weekendSurcharge,
      subtotal: quote.weekendSurcharge,
    })
  }

  if (quote.deliveryFee > 0) {
    lines.push({
      label: 'Delivery',
      quantity: 1,
      unitPrice: quote.deliveryFee,
      subtotal: quote.deliveryFee,
    })
  }

  return { lines, subtotal: quote.total }
}

export const calculateBicycleTourTotal = ({
  pricePerPerson,
  riders,
}: {
  pricePerPerson?: number | null
  riders: number
}): PriceBreakdown => {
  const unitPrice = round2(num(pricePerPerson))
  return {
    lines: [
      { label: 'Riders', quantity: riders, unitPrice, subtotal: round2(unitPrice * riders) },
    ],
    subtotal: round2(unitPrice * riders),
  }
}

// ---------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------

export type TotalsInput = {
  subtotal: number
  discount?: number
  /** Fractional rate, e.g. 0.14 for 14% VAT. */
  taxRate?: number
}

export const applyTotals = ({ subtotal, discount = 0, taxRate = 0 }: TotalsInput) => {
  // Discount can never exceed the subtotal, so a total is never negative.
  const safeDiscount = Math.min(Math.max(0, discount), subtotal)
  const taxable = subtotal - safeDiscount
  const tax = round2(taxable * Math.max(0, taxRate))

  return {
    subtotal: round2(subtotal),
    discount: round2(safeDiscount),
    tax,
    total: round2(taxable + tax),
  }
}
