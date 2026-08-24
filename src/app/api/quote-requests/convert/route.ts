import { NextResponse } from 'next/server'
import { headers as nextHeaders } from 'next/headers'

import { getPayloadClient } from '@/lib/payload/client'

type Doc = Record<string, any>

/**
 * Turns a quoted QuoteRequest into a Booking (spec Section 7, step 5).
 *
 * Staff-only and access-checked against the signed-in admin user — this runs with the
 * caller's own permissions, not overrideAccess, so a support user cannot create
 * bookings through it just because the button is on their screen.
 */
export const POST = async (request: Request) => {
  try {
    const payload = await getPayloadClient()
    const { user } = await payload.auth({ headers: await nextHeaders() })

    if (!user) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
    }

    const { id } = (await request.json()) as { id?: string }
    if (!id) {
      return NextResponse.json({ success: false, error: 'validation' }, { status: 400 })
    }

    const quote = (await payload.findByID({
      collection: 'quote-requests',
      id,
      depth: 0,
      user,
      overrideAccess: false,
    })) as Doc

    if (quote.convertedBooking) {
      return NextResponse.json(
        { success: false, error: 'already_converted', bookingId: quote.convertedBooking },
        { status: 409 },
      )
    }

    const quotedPrice = Number(quote.quotedPrice) || 0
    const [firstName, ...rest] = String(quote.name ?? '').split(' ')

    const booking = (await payload.create({
      collection: 'bookings',
      user,
      overrideAccess: false,
      data: {
        serviceType: 'transfer',
        status: 'pending',
        paymentStatus: 'unpaid',
        // The enquiry arrived by WhatsApp, so the booking records that provenance.
        source: 'whatsapp',
        customer: {
          firstName: firstName || String(quote.name ?? ''),
          lastName: rest.join(' '),
          email: quote.email ?? undefined,
          phone: quote.phone ?? undefined,
          locale: quote.preferredLanguage ?? undefined,
          notes: quote.specialRequests ?? undefined,
        },
        travelers: { adults: Number(quote.passengers) || 1, children: 0, infants: 0 },
        dates: { startDate: quote.date ?? undefined },
        lineItems: [
          {
            itemType: 'vehicle',
            label: `Custom trip — ${quote.pickupLocation ?? ''} → ${quote.dropoffLocation ?? ''}`.trim(),
            quantity: 1,
            // The manager's hand-quoted price becomes the line item; the Bookings hook
            // derives subtotal and total from it.
            unitPrice: quotedPrice,
          },
        ],
        pricing: { currency: 'USD', discount: 0, taxRate: 0 },
        serviceDetails: {
          transfer: {
            pickup: quote.pickupLocation ?? '',
            dropoff: quote.dropoffLocation ?? '',
            vehicleClass: quote.vehiclePreference ?? '',
            pickupTime: quote.time ?? '',
          },
        },
      } as never,
    })) as Doc

    await payload.update({
      collection: 'quote-requests',
      id,
      user,
      overrideAccess: false,
      data: { status: 'converted', convertedBooking: booking.id } as never,
    })

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
    })
  } catch (error) {
    console.error('[api/quote-requests/convert] failed', error)
    return NextResponse.json({ success: false, error: 'server' }, { status: 500 })
  }
}
