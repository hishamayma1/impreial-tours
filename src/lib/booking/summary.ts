import type { PriceLine } from '@/lib/pricing'

/**
 * The receipt a customer sees after booking — built for them to screenshot and keep.
 *
 * The confirmation page deliberately never looks a booking up by reference (a guessed
 * reference must not reveal someone's details), so the page that just submitted the
 * booking hands this over through sessionStorage instead. Only the tab that made the
 * booking can read it back, and it carries only what that tab already had on screen.
 *
 * `rows` are already translated when saved; `lines` and `total` are the SERVER's
 * figures from the booking response, so the receipt shows what was recorded rather
 * than what the browser estimated.
 */
export type BookingSummaryData = {
  reference: string
  kind: 'booking' | 'quote'
  createdAt: string
  serviceLabel: string
  itemLabel: string
  rows: Array<{ label: string; value: string }>
  lines: PriceLine[]
  /** In USD, the currency every booking is recorded in. */
  total: number | null
  contact: { name: string; email: string; phone: string }
  whatsappUrl?: string | null
}

const KEY = 'imperial-tours.last-booking'

export const saveBookingSummary = (summary: BookingSummaryData) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(summary))
  } catch {
    // Private mode or a full quota: the confirmation falls back to the reference alone.
  }
}

export const loadBookingSummary = (reference: string): BookingSummaryData | null => {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BookingSummaryData
    return parsed?.reference === reference ? parsed : null
  } catch {
    return null
  }
}
