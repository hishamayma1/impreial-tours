import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/payload/client'
import { leadSchema, type LeadInput } from '@/lib/validation/lead'
import { rateLimit, clientIp, verifyCaptcha } from '@/lib/rate-limit'
import { buildLeadMessage, buildWhatsappUrl } from '@/lib/whatsapp'

type Doc = Record<string, any>

/**
 * The home page's "plan my journey" enquiry.
 *
 * Records a `quote-requests` document — the same collection the custom-trip form
 * writes to — so sales works one inbox rather than two, and hands back a WhatsApp
 * deep link so a visitor who would rather chat than wait for a callback can.
 *
 * Deliberately not gated on `enableCustomQuote`: that switch turns off *pricing* a
 * bespoke transfer, which is a commitment the team may not want to make out of
 * season. Refusing to take a name and a phone number is never the right answer for a
 * business that lives on enquiries.
 */
export const POST = async (request: Request) => {
  const ip = clientIp(request.headers)
  const limit = rateLimit(`lead:${ip}`, { limit: 5, windowMs: 60_000 })
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let input: LeadInput
  try {
    input = leadSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ success: false, error: 'validation' }, { status: 400 })
  }

  /**
   * Honeypot. Answered with a plain 200 rather than a 4xx on purpose — a bot that
   * learns which shape gets rejected simply stops sending that shape, whereas one
   * that believes it succeeded keeps posting into a void.
   */
  if (input.company.trim()) {
    return NextResponse.json({ success: true, reference: null, whatsappUrl: null })
  }

  if (!(await verifyCaptcha(input.captchaToken, ip))) {
    return NextResponse.json({ success: false, error: 'captcha' }, { status: 400 })
  }

  try {
    const payload = await getPayloadClient()

    const lead = (await payload.create({
      collection: 'quote-requests',
      overrideAccess: true,
      data: {
        status: 'new',
        serviceInterest: input.serviceInterest,
        name: input.name,
        phone: input.phone,
        email: input.email || undefined,
        date: input.date || undefined,
        passengers: input.travellers,
        specialRequests: input.message,
        preferredLanguage: input.preferredLanguage,
      } as never,
    })) as Doc

    // Human-readable and short enough to read out over the phone.
    const reference = `LD-${String(lead.id).slice(-6).toUpperCase()}`

    const settings = (await payload.findGlobal({
      slug: 'site-settings',
      depth: 0,
      overrideAccess: true,
    })) as Doc

    const message = buildLeadMessage(input, reference, input.preferredLanguage)
    const whatsappUrl = buildWhatsappUrl(
      String(settings?.contact?.whatsappNumber ?? settings?.whatsappNumber ?? ''),
      message,
    )

    /**
     * Staff notification. The enquiry is already stored by this point, so a mail
     * failure is logged rather than thrown — losing the lead to protect the inbox
     * would be exactly backwards.
     */
    const salesInbox = process.env.SALES_INBOX_EMAIL || process.env.SMTP_FROM_ADDRESS
    if (salesInbox) {
      try {
        await payload.sendEmail({
          to: salesInbox,
          subject: `New enquiry ${reference} — ${input.name}`,
          text: `${message}\n\nOpen in the dashboard: /admin/collections/quote-requests/${lead.id}`,
        })
      } catch (err) {
        payload.logger.error({ err }, `Lead ${reference}: staff notification failed`)
      }
    }

    return NextResponse.json({ success: true, reference, whatsappUrl })
  } catch (error) {
    console.error('[api/leads] failed', error)
    return NextResponse.json({ success: false, error: 'server' }, { status: 500 })
  }
}
