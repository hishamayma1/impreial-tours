import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/payload/client'
import { quoteRequestSchema, type QuoteRequestInput } from '@/lib/validation/booking'
import { rateLimit, clientIp, verifyCaptcha } from '@/lib/rate-limit'
import { buildQuoteMessage, buildWhatsappUrl } from '@/lib/whatsapp'

type Doc = Record<string, any>

/**
 * Spec Section 7. A custom trip has no catalogue price, so this never creates a
 * Booking: it records a QuoteRequest for staff to price by hand, and returns a wa.me
 * deep link pre-filled in the customer's language.
 */
export const POST = async (request: Request) => {
  const ip = clientIp(request.headers)
  const limit = rateLimit(`quote:${ip}`, { limit: 5, windowMs: 60_000 })
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let input: QuoteRequestInput
  try {
    input = quoteRequestSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ success: false, error: 'validation' }, { status: 400 })
  }

  if (!(await verifyCaptcha(input.captchaToken, ip))) {
    return NextResponse.json({ success: false, error: 'captcha' }, { status: 400 })
  }

  try {
    const payload = await getPayloadClient()

    const settings = (await payload.findGlobal({
      slug: 'site-settings',
      depth: 0,
      overrideAccess: true,
    })) as Doc

    if (settings?.enableCustomQuote === false) {
      return NextResponse.json({ success: false, error: 'disabled' }, { status: 403 })
    }

    const quote = (await payload.create({
      collection: 'quote-requests',
      overrideAccess: true,
      data: {
        status: 'new',
        serviceInterest: 'transfers',
        name: input.name,
        phone: input.phone,
        email: input.email || undefined,
        pickupLocation: input.pickupLocation,
        dropoffLocation: input.dropoffLocation,
        stops: input.stops.filter(Boolean).map((location) => ({ location })),
        date: input.date || undefined,
        time: input.time,
        passengers: input.passengers,
        luggage: input.luggage,
        vehiclePreference: input.vehiclePreference,
        specialRequests: input.specialRequests,
        preferredLanguage: input.preferredLanguage,
      } as never,
    })) as Doc

    // Human-readable and short enough to quote over the phone.
    const reference = `QR-${String(quote.id).slice(-6).toUpperCase()}`
    const message = buildQuoteMessage(input, reference, input.preferredLanguage)
    const whatsappUrl = buildWhatsappUrl(String(settings?.contact?.whatsappNumber ?? ''), message)

    if (whatsappUrl) {
      // Recorded so staff can tell a handed-off enquiry from one still waiting.
      await payload.update({
        collection: 'quote-requests',
        id: quote.id,
        overrideAccess: true,
        data: { whatsappSentAt: new Date().toISOString() } as never,
      })
    }

    // Staff notification. A mail failure must not lose the enquiry that is already
    // safely stored, so it is logged rather than thrown.
    const salesInbox = process.env.SALES_INBOX_EMAIL || process.env.SMTP_FROM_ADDRESS
    if (salesInbox) {
      try {
        await payload.sendEmail({
          to: salesInbox,
          subject: `New quote request ${reference} — ${input.name}`,
          text: `${message}\n\nOpen in the dashboard: /admin/collections/quote-requests/${quote.id}`,
        })
      } catch (err) {
        payload.logger.error({ err }, `Quote ${reference}: staff notification failed`)
      }
    }

    return NextResponse.json({ success: true, quoteId: reference, whatsappUrl })
  } catch (error) {
    console.error('[api/whatsapp-quote] failed', error)
    return NextResponse.json({ success: false, error: 'server' }, { status: 500 })
  }
}
