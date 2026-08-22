import type { CollectionBeforeChangeHook, CollectionAfterChangeHook } from 'payload'
import { applyTotals } from '@/lib/pricing'

/**
 * IMP-YYYY-XXXXX. The random suffix is checked against the collection so a collision
 * cannot silently overwrite another booking's reference; five base-36 characters give
 * ~60M combinations per year, so a retry is rare and three attempts is plenty.
 */
const generateReference = async (
  findExisting: (reference: string) => Promise<number>,
): Promise<string> => {
  const year = new Date().getFullYear()

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase().padEnd(5, '0')
    const reference = `IMP-${year}-${suffix}`
    if ((await findExisting(reference)) === 0) return reference
  }

  // Fall back to a timestamp, which cannot collide within the same millisecond.
  return `IMP-${year}-${Date.now().toString(36).slice(-5).toUpperCase()}`
}

export const withBookingReference: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation === 'create' && !data.bookingReference) {
    data.bookingReference = await generateReference(async (reference) => {
      const { totalDocs } = await req.payload.count({
        collection: 'bookings',
        where: { bookingReference: { equals: reference } },
        overrideAccess: true,
      })
      return totalDocs
    })
  }
  return data
}

/**
 * Re-derives the money from the line items on every write, so a tampered client payload
 * cannot set its own total. The line items themselves are built from CMS data by the
 * checkout route handler — this hook is the second gate, not the first.
 */
export const recalculateTotals: CollectionBeforeChangeHook = ({ data }) => {
  const lineItems = Array.isArray(data.lineItems) ? data.lineItems : []

  const subtotal = lineItems.reduce((sum: number, item: Record<string, unknown>) => {
    const quantity = Number(item?.quantity) || 0
    const unitPrice = Number(item?.unitPrice) || 0
    // Trust quantity x unitPrice over any subtotal the client supplied.
    const line = quantity * unitPrice
    item.subtotal = Math.round(line * 100) / 100
    return sum + line
  }, 0)

  const pricing = (data.pricing ?? {}) as Record<string, unknown>
  const totals = applyTotals({
    subtotal,
    discount: Number(pricing.discount) || 0,
    taxRate: Number(pricing.taxRate) || 0,
  })

  data.pricing = {
    ...pricing,
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total,
  }

  return data
}

/**
 * Confirmation to the customer, notification to the sales inbox. Failures are logged
 * but never thrown — a mail outage must not roll back a booking the customer has
 * already completed.
 */
export const notifyOnBooking: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc

  const reference = doc.bookingReference
  const customerEmail = doc.customer?.email
  const salesInbox = process.env.SALES_INBOX_EMAIL || process.env.SMTP_FROM_ADDRESS

  const total = `${doc.pricing?.total ?? 0} ${doc.pricing?.currency ?? ''}`.trim()
  const name = [doc.customer?.firstName, doc.customer?.lastName].filter(Boolean).join(' ')

  if (customerEmail) {
    try {
      await req.payload.sendEmail({
        to: customerEmail,
        subject: `Your Imperial Tours booking ${reference}`,
        text: [
          `Thank you${name ? `, ${name}` : ''}.`,
          '',
          `Your booking reference is ${reference}.`,
          `Service: ${doc.serviceType}`,
          `Total: ${total}`,
          '',
          'We will be in touch shortly with the details.',
        ].join('\n'),
      })
    } catch (err) {
      req.payload.logger.error({ err }, `Booking ${reference}: customer email failed`)
    }
  }

  if (salesInbox) {
    try {
      await req.payload.sendEmail({
        to: salesInbox,
        subject: `New booking ${reference} — ${doc.serviceType}`,
        text: [
          `Reference: ${reference}`,
          `Customer: ${name} <${customerEmail ?? 'no email'}>`,
          `Phone: ${doc.customer?.phone ?? '—'}`,
          `Total: ${total}`,
          `Source: ${doc.source ?? 'website'}`,
        ].join('\n'),
      })
    } catch (err) {
      req.payload.logger.error({ err }, `Booking ${reference}: staff notification failed`)
    }
  }

  return doc
}
