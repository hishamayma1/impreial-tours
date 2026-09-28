/**
 * Formatting shared by the dashboard and the list-view cells, so a date, a price or a
 * status reads identically everywhere staff meet it.
 *
 * Dates are rendered in Cairo time: the team works from Egypt, and a server running in
 * UTC would otherwise greet them with "Good afternoon" at 5pm local and put a 1am
 * booking on the wrong day.
 */

export const OFFICE_TIME_ZONE = 'Africa/Cairo'

const officeParts = (date: Date) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: OFFICE_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'longOffset',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'timeZoneName', string>

/**
 * Midnight in Cairo, `days` from today, as an absolute instant — the boundaries the
 * dashboard's "today", "this week" and "this month" figures are counted between.
 * Egypt observes daylight saving, so the offset is read rather than hard-coded.
 */
export const officeMidnight = (days = 0, { startOfMonth = false } = {}): Date => {
  const parts = officeParts(new Date())
  // "GMT+03:00" -> "+03:00"; plain "GMT" means UTC.
  const offset = parts.timeZoneName.replace('GMT', '') || '+00:00'
  const day = startOfMonth ? '01' : parts.day
  const date = new Date(`${parts.year}-${parts.month}-${day}T00:00:00${offset}`)
  date.setUTCDate(date.getUTCDate() + days)
  return date
}

export const officeHour = (): number => Number(officeParts(new Date()).hour)

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: OFFICE_TIME_ZONE,
})

const shortDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: OFFICE_TIME_ZONE,
})

const toDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' && !(value instanceof Date)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDate = (value: unknown): string => {
  const date = toDate(value)
  return date ? dateFormat.format(date) : '—'
}

/** "12 Oct → 15 Oct 2026", or a single date when there is no end, or none. */
export const formatDateRange = (start: unknown, end: unknown): string => {
  const from = toDate(start)
  const to = toDate(end)
  if (!from) return '—'
  if (!to || to.getTime() === from.getTime()) return dateFormat.format(from)
  return `${shortDateFormat.format(from)} → ${dateFormat.format(to)}`
}

export const formatMoney = (amount: unknown, currency: unknown = 'USD'): string => {
  const value = typeof amount === 'number' ? amount : Number(amount)
  if (amount === null || amount === undefined || amount === '' || Number.isNaN(value)) return '—'
  const code = typeof currency === 'string' && /^[A-Z]{3}$/.test(currency) ? currency : 'USD'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * One colour per meaning, not per collection: "needs action" is amber whether it is a
 * pending booking, an unpaid one or a new quote request, so the eye learns one rule.
 */
export type Tone = 'attention' | 'progress' | 'success' | 'muted' | 'danger'

const TONES: Record<string, Tone> = {
  // Needs someone to act.
  pending: 'attention',
  new: 'attention',
  unpaid: 'attention',
  // In motion.
  contacted: 'progress',
  quoted: 'progress',
  deposit: 'progress',
  // Done, in a good way.
  confirmed: 'success',
  completed: 'success',
  paid: 'success',
  converted: 'success',
  // Over.
  closed: 'muted',
  refunded: 'muted',
  // Lost.
  cancelled: 'danger',
}

export const toneFor = (value: string): Tone => TONES[value] ?? 'muted'

/** Title-cases a raw option value when no label is available: `dailyTour` -> "Daily tour". */
export const humanize = (value: string): string => {
  const spaced = value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
