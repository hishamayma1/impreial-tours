import { z } from 'zod'

import { locales } from '@/i18n/routing'

/**
 * One schema, used by both the client form and the route handler. The server
 * re-validates rather than trusting the client's word that it already did.
 *
 * Note what is absent: prices. The client never sends money — the handler recomputes
 * every figure from the CMS.
 */

const nonEmpty = (max = 200) => z.string().trim().min(1).max(max)

export const contactSchema = z.object({
  firstName: nonEmpty(80),
  lastName: z.string().trim().max(80).optional().default(''),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().default(''),
  country: z.string().trim().max(80).optional().default(''),
  notes: z.string().trim().max(2000).optional().default(''),
})

export const travelersSchema = z.object({
  adults: z.number().int().min(1).max(40),
  children: z.number().int().min(0).max(40),
  infants: z.number().int().min(0).max(40),
})

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

export const roomSelectionSchema = z.object({
  roomTypeId: nonEmpty(64),
  occupancy: z.enum(['single', 'double', 'triple']),
  guests: z.number().int().min(1).max(6),
  quantity: z.number().int().min(1).max(10),
})

export const transferDetailsSchema = z.object({
  pickup: z.string().trim().max(200).optional().default(''),
  dropoff: z.string().trim().max(200).optional().default(''),
  flightNumber: z.string().trim().max(20).optional().default(''),
  vehicleClass: z.string().trim().max(80).optional().default(''),
  pickupTime: z.string().trim().max(10).optional().default(''),
  roundTrip: z.boolean().optional().default(false),

  /**
   * Which priced row the customer chose — an airport zone or an intercity route.
   *
   * This is the field that makes the quote verifiable. Prices live per zone and per
   * route but the *vehicle class* is the same word in every one of them, so a server
   * that matched on the class name alone would happily charge the cheapest "Sedan" in
   * the document for a ride to the dearest zone. Naming the row turns the request into
   * something the server can price exactly one way.
   *
   * Optional only because the field is new and the booking wizard's older transfer
   * path does not send it; the route refuses to price a transfer without one.
   */
  zoneId: z.string().trim().max(64).optional().default(''),
  routeId: z.string().trim().max(64).optional().default(''),
  airportId: z.string().trim().max(64).optional().default(''),
  terminal: z.string().trim().max(80).optional().default(''),
  passengers: z.number().int().min(1).max(60).optional().default(1),
  luggage: z.number().int().min(0).max(60).optional().default(0),
  /** Row ids of the chosen add-ons. Prices are read from the CMS, never from here. */
  extraIds: z.array(z.string().trim().max(64)).max(20).optional().default([]),
})

export const bicycleSelectionSchema = z.object({
  durationHours: z.number().min(0.5).max(720),
  quantity: z.number().int().min(1).max(20),
  pickupTime: z.string().trim().max(10).optional().default(''),
  returnTime: z.string().trim().max(10).optional().default(''),
})

export const createBookingSchema = z
  .object({
    serviceType: z.enum(['dailyTour', 'experience', 'hotel', 'transfer', 'bicycle']),
    slug: z.string().trim().max(200).optional(),
    itemId: z.string().trim().max(64).nullable().optional(),
    locale: z.enum(locales),
    dates: z.object({
      start: isoDate.nullable().optional(),
      end: isoDate.nullable().optional(),
    }),
    travelers: travelersSchema,
    hotelSelection: z.array(roomSelectionSchema).max(10).optional().default([]),
    transferDetails: transferDetailsSchema.nullable().optional(),
    bicycleSelection: bicycleSelectionSchema.nullable().optional(),
    contact: contactSchema,
    /**
     * Honeypot. A human never sees this input, so any value at all is a bot.
     *
     * Optional with an empty default so the existing booking wizard, which does not
     * render one, keeps validating unchanged — this is a new defence on a shared
     * endpoint, not a new requirement placed on every caller.
     */
    company: z.string().max(200).optional().default(''),
  })
  .refine((data) => data.serviceType !== 'hotel' || data.hotelSelection.length > 0, {
    message: 'A hotel booking needs at least one room',
    path: ['hotelSelection'],
  })
  .refine(
    (data) =>
      data.serviceType !== 'hotel' || (Boolean(data.dates.start) && Boolean(data.dates.end)),
    { message: 'A stay needs both a check-in and a check-out date', path: ['dates'] },
  )

export type CreateBookingInput = z.infer<typeof createBookingSchema>

/** Spec Section 7: the custom-trip form. */
export const quoteRequestSchema = z.object({
  name: nonEmpty(120),
  phone: nonEmpty(40),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  pickupLocation: nonEmpty(200),
  dropoffLocation: z.string().trim().max(200).optional().default(''),
  stops: z.array(z.string().trim().max(200)).max(10).optional().default([]),
  date: isoDate.optional().or(z.literal('')),
  time: z.string().trim().max(10).optional().default(''),
  passengers: z.number().int().min(1).max(60),
  luggage: z.number().int().min(0).max(60),
  vehiclePreference: z.string().trim().max(80).optional().default(''),
  specialRequests: z.string().trim().max(2000).optional().default(''),
  preferredLanguage: z.enum(locales),
  /** Turnstile / reCAPTCHA response, verified server-side when configured. */
  captchaToken: z.string().max(4000).optional().default(''),
})

export type QuoteRequestInput = z.output<typeof quoteRequestSchema>

/**
 * What the FORM holds, before Zod applies its defaults. Fields with `.default()` are
 * optional on the way in and guaranteed on the way out, so react-hook-form must be
 * typed against the input side or its resolver will not line up.
 */
export type QuoteRequestFormValues = z.input<typeof quoteRequestSchema>
