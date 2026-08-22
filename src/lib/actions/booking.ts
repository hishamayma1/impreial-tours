'use server'

import { headers } from 'next/headers'
import { getPayloadClient } from '@/lib/payload/client'
import { locales, type Locale } from '@/i18n/routing'
import { TOUR_TYPES, type TourType } from '@/stores/search-store'

export type BookingEnquiryInput = {
  destination: string
  travelDate?: string
  tourType: string
  guests?: number
  fullName?: string
  email?: string
  notes?: string
  locale: string
  currency?: string
}

export type BookingEnquiryResult =
  | { ok: true; reference: string }
  | { ok: false; error: 'validation' | 'server' }

const isTourType = (value: string): value is TourType =>
  (TOUR_TYPES as readonly string[]).includes(value)

const isLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value)

/**
 * Writes a booking enquiry straight through Payload's local API, so the same access
 * control, hooks and validation the dashboard uses apply to public submissions.
 */
export async function createBookingEnquiry(
  input: BookingEnquiryInput,
): Promise<BookingEnquiryResult> {
  const destination = input.destination?.trim()
  if (!destination || !isTourType(input.tourType)) {
    return { ok: false, error: 'validation' }
  }

  try {
    const payload = await getPayloadClient()
    const requestHeaders = await headers()

    const doc = await payload.create({
      collection: 'bookings',
      data: {
        // The hero search captures an open enquiry before a product is chosen, so it
        // lands in the unified Bookings funnel under the 'enquiry' service type.
        serviceType: 'enquiry',
        status: 'pending',
        source: 'website',
        customer: {
          firstName: input.fullName?.trim() || 'Website enquiry',
          email: input.email?.trim() || undefined,
          notes: input.notes?.trim() || undefined,
          locale: isLocale(input.locale) ? input.locale : undefined,
        },
        travelers: {
          adults: typeof input.guests === 'number' ? input.guests : 2,
        },
        dates: {
          startDate: input.travelDate || undefined,
        },
        pricing: {
          currency: input.currency || 'USD',
        },
        serviceDetails: {
          enquiry: {
            destination,
            tourType: input.tourType,
            path: requestHeaders.get('referer') ?? undefined,
          },
        },
      },
      // The form is public; Bookings is staff-only by design.
      overrideAccess: true,
    })

    return { ok: true, reference: String((doc as { bookingReference?: string }).bookingReference ?? doc.id) }
  } catch {
    return { ok: false, error: 'server' }
  }
}
