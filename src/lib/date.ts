import type { Locale } from '@/i18n/routing'

/** Today, in the browser's own timezone — `toISOString` would report UTC's date. */
export const todayISO = (): string => {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

/** Parses a `YYYY-MM-DD` string as a local calendar date, never shifting a day at UTC. */
export const isoToDate = (iso: string): Date | undefined => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined
  const date = new Date(`${iso}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** The inverse of {@link isoToDate} — a `Date` back to `YYYY-MM-DD` in local time. */
export const dateToISO = (date: Date): string => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

/** A `YYYY-MM-DD` string formatted for display in the visitor's locale. */
export const formatISODate = (iso: string, locale: Locale | string): string => {
  const date = isoToDate(iso)
  if (!date) return ''
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    date,
  )
}

/** Adds hours to a "HH:MM" clock time, wrapping past midnight. */
export const addHoursToTime = (time: string, hours: number): string => {
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return ''
  const total = (h * 60 + m + Math.round(hours * 60)) % (24 * 60)
  const wrapped = total < 0 ? total + 24 * 60 : total
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`
}
