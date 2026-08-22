import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/payload/client'
import { createBookingSchema, type CreateBookingInput } from '@/lib/validation/booking'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import {
  calculateHotelTotal,
  calculateDailyTourTotal,
  calculateExperienceTotal,
  calculateTransferTotal,
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
              travellers: input.travelers.adults + input.travelers.children,
              departureDate: input.dates.start,
            })

      lines.push(...breakdown.lines)
      serviceDetails.tour = { departureDate: input.dates.start }
    }

    // --- Transfers ---------------------------------------------------------
    if (input.serviceType === 'transfer') {
      const transfer = await findBySlug(payload, 'transfers', input.slug, input.locale)
      if (!transfer || !input.transferDetails) return notFound()

      refId = String(transfer.id)
      label = String(transfer.title ?? '')

      // Prices live per zone (airport) or per route (intercity); flatten both and
      // match on the requested vehicle class.
      const pricing = [
        ...(transfer.zones ?? []).flatMap((zone: Doc) => zone.vehiclePricing ?? []),
        ...(transfer.routes ?? []).flatMap((route: Doc) => route.vehiclePricing ?? []),
      ]

      const breakdown = calculateTransferTotal({
        vehiclePricing: pricing,
        vehicleClass: input.transferDetails.vehicleClass,
        roundTrip: input.transferDetails.roundTrip,
      })
      lines.push(...breakdown.lines)

      serviceDetails.transfer = input.transferDetails
    }

    // --- Bicycles ----------------------------------------------------------
    if (input.serviceType === 'bicycle') {
      const bike = await findBySlug(payload, 'bicycles', input.slug, input.locale)
      if (!bike) return notFound()

      refId = String(bike.id)
      label = String(bike.title ?? '')

      const breakdown =
        bike.bikeType === 'tour'
          ? calculateBicycleTourTotal({
              pricePerPerson: bike.pricePerPerson,
              riders: input.travelers.adults + input.travelers.children,
            })
          : calculateBicycleRentalTotal({
              bands: bike.rentalPricing ?? [],
              hours: input.bicycleSelection?.durationHours ?? 0,
              quantity: input.bicycleSelection?.quantity ?? 1,
            })

      lines.push(...breakdown.lines)
      serviceDetails.bicycle = input.bicycleSelection ?? {}
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
        travelers: input.travelers,
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

    return NextResponse.json({
      success: true,
      bookingReference: (booking as Doc).bookingReference,
      total: (booking as Doc).pricing?.total ?? 0,
    })
  } catch (error) {
    console.error('[api/bookings] failed', error)
    return NextResponse.json({ success: false, error: 'server' }, { status: 500 })
  }
}

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
