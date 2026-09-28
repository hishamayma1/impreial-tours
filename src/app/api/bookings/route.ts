import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/payload/client'
import { createBookingSchema, type CreateBookingInput } from '@/lib/validation/booking'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { isWeekendDate } from '@/lib/booking/estimate'
import {
  calculateHotelTotal,
  calculateDailyTourTotal,
  calculateExperienceTotal,
  calculateTransferTotal,
  calculateExtrasTotal,
  calculateBicycleRentalTotal,
  calculateBicycleTourTotal,
  nightsBetween,
  type PriceLine,
} from '@/lib/pricing'

type Doc = Record<string, any>

/**
 * Checkout. The client sends WHAT it wants, never what it costs — every figure below
 * is read from the CMS and recomputed here, so editing the payload in devtools changes
 * nothing but the shape of the request.
 */
export const POST = async (request: Request) => {
  const ip = clientIp(request.headers)
  const limit = rateLimit(`bookings:${ip}`, { limit: 8, windowMs: 60_000 })
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let input: CreateBookingInput
  try {
    input = createBookingSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ success: false, error: 'validation' }, { status: 400 })
  }

  /**
   * Honeypot. Answered with a plain 200 rather than a 4xx on purpose — a bot that
   * learns which shape gets rejected simply stops sending that shape, whereas one
   * that believes it succeeded keeps posting into a void. Mirrors /api/leads.
   */
  if (input.company.trim()) {
    return NextResponse.json({ success: true, reference: null, bookingId: null })
  }

  /**
   * No bookings in the past. Compared against yesterday in UTC rather than today, so a
   * visitor east of Greenwich booking for their own "today" is never refused because
   * the server's clock is still on the day before.
   */
  const earliest = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  if (input.dates.start && input.dates.start < earliest) {
    return badRequest('date_past')
  }

  try {
    const payload = await getPayloadClient()

    const lines: PriceLine[] = []
    const serviceDetails: Doc = {}
    let refId: string | null = null
    let label = ''

    // --- Hotels ------------------------------------------------------------
    if (input.serviceType === 'hotel') {
      const hotel = await findBySlug(payload, 'hotels', input.slug, input.locale)
      if (!hotel) return notFound()

      refId = String(hotel.id)
      label = String(hotel.name ?? '')

      const breakdown = calculateHotelTotal({
        roomTypes: (hotel.roomTypes ?? []).map((room: Doc) => ({
          id: String(room.id),
          roomName: String(room.roomName ?? ''),
          maxOccupancy: room.maxOccupancy,
          extraBedPrice: room.extraBedPrice,
          pricing: room.pricing,
        })),
        selections: input.hotelSelection,
        checkIn: input.dates.start,
        checkOut: input.dates.end,
        seasonalRates: hotel.seasonalRates,
      })
      lines.push(...breakdown.lines)

      serviceDetails.hotel = { rooms: input.hotelSelection }
    }

    // --- Tours -------------------------------------------------------------
    if (input.serviceType === 'dailyTour' || input.serviceType === 'experience') {
      const tour = await findBySlug(payload, 'tours', input.slug, input.locale)
      if (!tour) return notFound()

      refId = String(tour.id)
      label = String(tour.title ?? '')

      const party = input.travelers.adults + input.travelers.children
      if (typeof tour.groupSizeMax === 'number' && tour.groupSizeMax > 0 && party > tour.groupSizeMax) {
        return badRequest('group_too_large')
      }

      const options = input.tourOptions ?? { startTime: '', singleRooms: 0 }
      // Never more single rooms than there are travellers to sleep in them.
      const singleRooms = Math.min(options.singleRooms, party)

      const breakdown =
        input.serviceType === 'dailyTour'
          ? calculateDailyTourTotal({
              tour: {
                pricePerPerson: tour.pricePerPerson,
                childPrice: tour.childPrice,
                privateGroupPrice: tour.privateGroupPrice,
              },
              adults: input.travelers.adults,
              children: input.travelers.children,
            })
          : calculateExperienceTotal({
              experience: { pricing: tour.pricing, departureDates: tour.departureDates },
              travellers: party,
              singleRooms,
              departureDate: input.dates.start,
            })

      lines.push(...breakdown.lines)
      serviceDetails.tour = {
        departureDate: input.dates.start,
        startTime: options.startTime,
        singleRooms: input.serviceType === 'experience' ? singleRooms : 0,
      }
    }

    // --- Transfers ---------------------------------------------------------
    if (input.serviceType === 'transfer') {
      const transfer = await findBySlug(payload, 'transfers', input.slug, input.locale)
      if (!transfer || !input.transferDetails) return notFound()

      refId = String(transfer.id)
      label = String(transfer.title ?? '')

      const details = input.transferDetails

      /**
       * Price from the one row the customer chose, never from a flattened pool.
       *
       * This previously concatenated every zone's and every route's vehicle prices
       * and matched on the class name. Because "Sedan" is the same string in every
       * zone, `find` returned whichever appeared first in the document — so a request
       * for a long, expensive zone was charged at the cheapest zone's rate, and the
       * client chose which by doing nothing more than naming a vehicle class. The row
       * id now comes in with the request and the lookup is scoped to that row alone.
       */
      const zone = (transfer.zones ?? []).find((row: Doc) => String(row.id) === details.zoneId)
      const route = (transfer.routes ?? []).find((row: Doc) => String(row.id) === details.routeId)
      const selected = zone ?? route

      // No identified row means no price we can stand behind. Refused rather than
      // guessed: a booking recorded at an invented figure is worse than a failed one.
      if (!selected) {
        return NextResponse.json(
          { success: false, error: 'transfer_route_required' },
          { status: 400 },
        )
      }

      const breakdown = calculateTransferTotal({
        vehiclePricing: selected.vehiclePricing ?? [],
        vehicleClass: details.vehicleClass,
        roundTrip: details.roundTrip,
      })

      // An unknown vehicle class prices at zero, which would otherwise be recorded as
      // a free transfer rather than as the bad request it is.
      if (!breakdown.lines.length) {
        return NextResponse.json(
          { success: false, error: 'transfer_vehicle_unknown' },
          { status: 400 },
        )
      }
      lines.push(...breakdown.lines)

      // Add-ons are priced from the CMS rows by id, so the request can select them
      // but never value them.
      const extras = calculateExtrasTotal({
        extras: transfer.extras ?? [],
        selectedIds: details.extraIds,
        passengers: details.passengers,
      })
      lines.push(...extras.lines)

      // `extraIds` and the row ids are omitted on purpose: the add-ons are already in
      // the price lines by name, and the ids identify nothing an operator can use.
      const { extraIds: _extraIds, zoneId: _zoneId, routeId: _routeId, ...recorded } = details

      serviceDetails.transfer = {
        ...recorded,
        // Resolved from the CMS rather than echoed from the request, so the booking
        // records which zone or route was actually charged.
        zoneName: zone ? String(zone.zoneName ?? '') : '',
        routeLabel: route ? `${route.fromCity ?? ''} → ${route.toCity ?? ''}` : '',
      }
    }

    // --- Bicycles ----------------------------------------------------------
    if (input.serviceType === 'bicycle') {
      const bike = await findBySlug(payload, 'bicycles', input.slug, input.locale)
      if (!bike) return notFound()

      refId = String(bike.id)
      label = String(bike.title ?? '')

      const selection = input.bicycleSelection
      /**
       * A guided ride is billed per rider, and the rider count is the one the visitor
       * chose on the ride's planner — carried as the selection's quantity. Billing the
       * wizard's adult headcount instead (which defaults to two) charged a solo rider
       * for a second seat.
       */
      const riders = selection?.quantity ?? input.travelers.adults + input.travelers.children

      if (bike.bikeType === 'tour') {
        if (typeof bike.maxGroupSize === 'number' && bike.maxGroupSize > 0 && riders > bike.maxGroupSize) {
          return badRequest('group_too_large')
        }
      } else if (
        typeof bike.inventory === 'number' &&
        bike.inventory > 0 &&
        (selection?.quantity ?? 1) > bike.inventory
      ) {
        return badRequest('out_of_stock')
      }

      // Derived from the date, not taken from the request: the surcharge is the
      // shop's rule, not something the customer opts out of.
      const weekend = isWeekendDate(input.dates.start)

      const breakdown =
        bike.bikeType === 'tour'
          ? calculateBicycleTourTotal({
              pricePerPerson: bike.pricePerPerson,
              riders,
            })
          : calculateBicycleRentalTotal({
              bands: bike.rentalPricing ?? [],
              hours: input.bicycleSelection?.durationHours ?? 0,
              quantity: input.bicycleSelection?.quantity ?? 1,
              // The rest of the time-pricing rules, read from the CMS rather than
              // echoed from the request, so what is charged is what the dashboard says
              // — including the hourly rate the planner may have quoted from.
              pricingMode: bike.pricingMode,
              hourlyRate: bike.hourlyRate,
              extraHourRate: bike.extraHourRate,
              minHours: bike.minHours,
              maxHours: bike.maxHours,
              hourStep: bike.hourStep,
              deliveryFee: bike.deliveryFee,
              weekendSurchargePct: bike.weekendSurchargePct,
              weekend,
              delivery: selection?.delivery,
            })

      lines.push(...breakdown.lines)
      serviceDetails.bicycle = {
        ...(selection ?? {}),
        quantity: bike.bikeType === 'tour' ? riders : (selection?.quantity ?? 1),
        pickupDate: input.dates.start ?? '',
        weekend,
      }
    }

    if (!lines.length) {
      // Nothing priced means the request did not match anything sellable.
      return NextResponse.json({ success: false, error: 'unavailable' }, { status: 409 })
    }

    const nights =
      input.serviceType === 'hotel' ? nightsBetween(input.dates.start, input.dates.end) : 0

    const booking = await payload.create({
      collection: 'bookings',
      // The Bookings collection is staff-only by design; the public path is this
      // handler, which has already validated and priced the request.
      overrideAccess: true,
      data: {
        serviceType: input.serviceType,
        status: 'pending',
        paymentStatus: 'unpaid',
        source: 'website',
        customer: { ...input.contact, locale: input.locale },
        travelers:
          input.serviceType === 'bicycle' && input.bicycleSelection
            ? { adults: input.bicycleSelection.quantity, children: 0, infants: 0 }
            : input.travelers,
        dates: { startDate: input.dates.start, endDate: input.dates.end },
        lineItems: lines.map((line) => ({
          itemType: itemTypeFor(input.serviceType),
          refId: refId ? { relationTo: collectionFor(input.serviceType), value: refId } : undefined,
          label: `${label} — ${line.label}${nights ? ` (${nights})` : ''}`.trim(),
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        // The beforeChange hook re-derives subtotal/tax/total from these line items.
        pricing: { currency: 'USD', discount: 0, taxRate: 0 },
        serviceDetails,
      } as never,
    })

    const record = booking as Doc

    /**
     * The priced lines go back with the reference so the customer's receipt shows the
     * figures that were recorded, line for line, rather than the browser's estimate.
     * `reference` and `bookingId` repeat the reference under the names the transfer
     * form has always read, which is why that form never showed one.
     */
    return NextResponse.json({
      success: true,
      bookingReference: record.bookingReference,
      reference: record.bookingReference,
      bookingId: record.bookingReference,
      total: record.pricing?.total ?? 0,
      currency: record.pricing?.currency ?? 'USD',
      lines: lines.map((line) => ({
        label: line.label,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        subtotal: line.subtotal,
      })),
    })
  } catch (error) {
    console.error('[api/bookings] failed', error)
    return NextResponse.json({ success: false, error: 'server' }, { status: 500 })
  }
}

const badRequest = (error: string) =>
  NextResponse.json({ success: false, error }, { status: 400 })

const notFound = () =>
  NextResponse.json({ success: false, error: 'not_found' }, { status: 404 })

const collectionFor = (serviceType: CreateBookingInput['serviceType']) =>
  serviceType === 'hotel'
    ? 'hotels'
    : serviceType === 'transfer'
      ? 'transfers'
      : serviceType === 'bicycle'
        ? 'bicycles'
        : 'tours'

const itemTypeFor = (serviceType: CreateBookingInput['serviceType']) =>
  serviceType === 'hotel'
    ? 'room'
    : serviceType === 'transfer'
      ? 'vehicle'
      : serviceType === 'bicycle'
        ? 'bicycle'
        : 'tour'

const findBySlug = async (
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  collection: 'tours' | 'hotels' | 'transfers' | 'bicycles',
  slug: string | undefined,
  locale: CreateBookingInput['locale'],
): Promise<Doc | null> => {
  if (!slug) return null

  const result = await payload.find({
    collection,
    locale,
    fallbackLocale: 'en',
    where: { slug: { equals: slug }, _status: { equals: 'published' } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  return (result.docs[0] as Doc) ?? null
}
