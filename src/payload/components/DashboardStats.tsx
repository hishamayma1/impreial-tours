import Link from 'next/link'

import { StatusPill } from './cells'
import { formatDateRange, formatMoney, formatDate, humanize } from './admin-format'

/**
 * Presentational half of the dashboard. Every number and every row is a link to the
 * records behind it, so the dashboard is a starting point rather than a report.
 * Styles live in custom.scss under `.it-dash`.
 */

export type IconName = 'calendar' | 'clock' | 'inbox' | 'plane' | 'wallet' | 'plus' | 'external'

const ICON_PATHS: Record<IconName, string> = {
  calendar: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  inbox: 'M4 13h4l2 3h4l2-3h4M5 5h14l2 8v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5l2-8Z',
  plane: 'M10.5 13.5 3 11l1.5-1.5 8 1 4-4a2.1 2.1 0 0 1 3 3l-4 4 1 8L15 23l-2.5-7.5M3 21h8',
  wallet: 'M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2Zm13 7h.01',
  plus: 'M12 5v14M5 12h14',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
}

export const DashIcon = ({ name }: { name: IconName }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden
    className="it-icon"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={ICON_PATHS[name]} />
  </svg>
)

export type Stat = {
  label: string
  value: number | null
  href: string
  icon: IconName
  hint: string
  format?: 'currency'
  /** Highlighted in the accent colour while non-zero: something is waiting on staff. */
  urgent?: boolean
}

const formatValue = (stat: Stat): string => {
  // null means the viewer's role cannot read that collection, or the read failed.
  if (stat.value === null) return '—'
  return stat.format === 'currency' ? formatMoney(stat.value) : String(stat.value)
}

export const DashboardStats = ({ stats }: { stats: Stat[] }) => (
  <div className="it-stats">
    {stats.map((stat) => {
      const urgent = Boolean(stat.urgent && stat.value)
      return (
        <Link
          key={stat.label}
          href={stat.href}
          className={`it-stat${urgent ? ' it-stat--urgent' : ''}`}
        >
          <span className="it-stat__top">
            <span className="it-stat__label">{stat.label}</span>
            <span className="it-stat__icon">
              <DashIcon name={stat.icon} />
            </span>
          </span>
          <span className="it-stat__value">{formatValue(stat)}</span>
          <span className="it-stat__hint">{urgent ? 'Needs attention' : stat.hint}</span>
        </Link>
      )
    })}
  </div>
)

export type RecentBooking = {
  id: string
  bookingReference?: string
  serviceType?: string
  status?: string
  customer?: { firstName?: string; lastName?: string; email?: string }
  dates?: { startDate?: string; endDate?: string }
  pricing?: { total?: number; currency?: string }
}

export const RecentBookings = ({ bookings }: { bookings: RecentBooking[] }) => (
  <section className="it-panel it-panel--wide" aria-labelledby="it-recent-bookings">
    <header className="it-panel__header">
      <h2 id="it-recent-bookings" className="it-panel__title">
        Recent bookings
      </h2>
      <Link href="/admin/collections/bookings" className="it-panel__link">
        View all
      </Link>
    </header>

    {bookings.length === 0 ? (
      <p className="it-empty">No bookings yet. New ones from the website appear here.</p>
    ) : (
      <div className="it-mini-table-wrap">
        <table className="it-mini-table">
          <thead>
            <tr>
              <th scope="col">Reference</th>
              <th scope="col">Guest</th>
              <th scope="col">Service</th>
              <th scope="col">Travel dates</th>
              <th scope="col" className="it-num">
                Total
              </th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => {
              const href = `/admin/collections/bookings/${booking.id}`
              const guest =
                [booking.customer?.firstName, booking.customer?.lastName]
                  .filter(Boolean)
                  .join(' ') ||
                booking.customer?.email ||
                '—'
              return (
                <tr key={booking.id}>
                  <td>
                    {/* The reference is the row's one real link; the rest of the row
                        is clickable through the stretched ::after in custom.scss. */}
                    <Link href={href} className="it-row-link">
                      {booking.bookingReference || 'Untitled'}
                    </Link>
                  </td>
                  <td>{guest}</td>
                  <td>
                    {booking.serviceType ? (
                      <span className="it-tag">{humanize(booking.serviceType)}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="it-nowrap">
                    {formatDateRange(booking.dates?.startDate, booking.dates?.endDate)}
                  </td>
                  <td className="it-num it-money">
                    {formatMoney(booking.pricing?.total, booking.pricing?.currency)}
                  </td>
                  <td>{booking.status ? <StatusPill value={booking.status} /> : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
)

export type RecentQuote = {
  id: string
  name?: string
  serviceInterest?: string
  status?: string
  createdAt?: string
}

export const RecentQuotes = ({ quotes }: { quotes: RecentQuote[] }) => (
  <section className="it-panel" aria-labelledby="it-recent-quotes">
    <header className="it-panel__header">
      <h2 id="it-recent-quotes" className="it-panel__title">
        Latest quote requests
      </h2>
      <Link href="/admin/collections/quote-requests" className="it-panel__link">
        View all
      </Link>
    </header>

    {quotes.length === 0 ? (
      <p className="it-empty">No quote requests yet.</p>
    ) : (
      <ul className="it-list">
        {quotes.map((quote) => (
          <li key={quote.id} className="it-list__item">
            <Link href={`/admin/collections/quote-requests/${quote.id}`} className="it-row-link">
              {quote.name || 'Unnamed'}
            </Link>
            <span className="it-list__meta">
              {[quote.serviceInterest && humanize(quote.serviceInterest), formatDate(quote.createdAt)]
                .filter(Boolean)
                .join(' · ')}
            </span>
            {quote.status ? <StatusPill value={quote.status} /> : null}
          </li>
        ))}
      </ul>
    )}
  </section>
)

export default DashboardStats
