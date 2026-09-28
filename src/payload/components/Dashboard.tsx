import Link from 'next/link'
import type { ServerProps } from 'payload'

import { officeHour, officeMidnight, OFFICE_TIME_ZONE } from './admin-format'
import {
  DashIcon,
  DashboardStats,
  RecentBookings,
  RecentQuotes,
  type RecentBooking,
  type RecentQuote,
} from './DashboardStats'

/**
 * Rendered above the admin dashboard's collection list. A server component, so every
 * figure is read through the Local API with no client round trip.
 *
 * Every read is scoped by the viewer's own access: `overrideAccess: false` with the
 * request user means an editor (who cannot see Bookings at all) gets dashes and no
 * activity panels, rather than a leak of sales data through a summary.
 *
 * Day and month boundaries are Cairo's, not the server's — see admin-format.ts.
 */

const BOOKINGS = '/admin/collections/bookings'
const QUOTES = '/admin/collections/quote-requests'

const greetingFor = (hour: number) =>
  hour < 5 ? 'Good evening' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

export const Dashboard = async ({ payload, user, permissions }: ServerProps) => {
  if (!payload || !user) return null

  // Offered only to roles that can actually create one — not merely read the list.
  const canCreateBooking = Boolean(permissions?.collections?.bookings?.create)

  const startOfToday = officeMidnight()
  const inSevenDays = officeMidnight(7)
  const startOfMonth = officeMidnight(0, { startOfMonth: true })

  const safeCount = async (
    collection: 'bookings' | 'quote-requests',
    where: Record<string, unknown>,
  ) => {
    try {
      const result = await payload.count({
        collection,
        where: where as never,
        user,
        overrideAccess: false,
      })
      return result.totalDocs
    } catch {
      // A role without access, or an unreachable database, shows a dash rather than
      // breaking the whole dashboard.
      return null
    }
  }

  const revenueThisMonth = async () => {
    try {
      const result = await payload.find({
        collection: 'bookings',
        where: {
          createdAt: { greater_than_equal: startOfMonth.toISOString() },
          status: { not_equals: 'cancelled' },
        },
        depth: 0,
        limit: 500,
        pagination: false,
        user,
        overrideAccess: false,
        select: { pricing: true },
      })

      return result.docs.reduce(
        (sum, doc) => sum + (Number((doc as { pricing?: { total?: number } }).pricing?.total) || 0),
        0,
      )
    } catch {
      return null
    }
  }

  const recentBookings = async (): Promise<RecentBooking[] | null> => {
    try {
      const result = await payload.find({
        collection: 'bookings',
        sort: '-createdAt',
        limit: 6,
        depth: 0,
        user,
        overrideAccess: false,
        select: {
          bookingReference: true,
          serviceType: true,
          status: true,
          customer: true,
          dates: true,
          pricing: true,
        },
      })
      return result.docs as unknown as RecentBooking[]
    } catch {
      return null
    }
  }

  const recentQuotes = async (): Promise<RecentQuote[] | null> => {
    try {
      const result = await payload.find({
        collection: 'quote-requests',
        sort: '-createdAt',
        limit: 5,
        depth: 0,
        user,
        overrideAccess: false,
        select: { name: true, serviceInterest: true, status: true, createdAt: true },
      })
      return result.docs as unknown as RecentQuote[]
    } catch {
      return null
    }
  }

  const [todaysBookings, pendingBookings, newQuotes, departures, revenue, bookings, quotes] =
    await Promise.all([
      safeCount('bookings', { createdAt: { greater_than_equal: startOfToday.toISOString() } }),
      safeCount('bookings', { status: { equals: 'pending' } }),
      safeCount('quote-requests', { status: { equals: 'new' } }),
      safeCount('bookings', {
        'dates.startDate': {
          greater_than_equal: startOfToday.toISOString(),
          less_than: inSevenDays.toISOString(),
        },
      }),
      revenueThisMonth(),
      recentBookings(),
      recentQuotes(),
    ])

  // Names are stored as typed ("hisham"); the greeting capitalises the first letter.
  const rawFirst = typeof user.name === 'string' ? user.name.trim().split(/\s+/)[0] ?? '' : ''
  const firstName = rawFirst.charAt(0).toLocaleUpperCase() + rawFirst.slice(1)
  const today = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: OFFICE_TIME_ZONE,
  }).format(new Date())

  // Each card opens the list already filtered to exactly the records it counted.
  const since = (field: string, from: Date) =>
    `${BOOKINGS}?where[${field}][greater_than_equal]=${encodeURIComponent(from.toISOString())}`

  return (
    <div className="it-dash">
      <header className="it-dash__hero">
        <div className="it-dash__intro">
          <p className="it-dash__eyebrow">{today}</p>
          <h1 className="it-dash__title">
            {greetingFor(officeHour())}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="it-dash__lede">Here is where the business stands today.</p>
        </div>

        <nav className="it-dash__actions" aria-label="Quick actions">
          {canCreateBooking ? (
            <Link href={`${BOOKINGS}/create`} className="it-action it-action--primary">
              <DashIcon name="plus" />
              New booking
            </Link>
          ) : null}
          {quotes !== null ? (
            <Link href={`${QUOTES}?where[status][equals]=new`} className="it-action">
              <DashIcon name="inbox" />
              New quotes
            </Link>
          ) : null}
          <a href="/" target="_blank" rel="noopener noreferrer" className="it-action">
            <DashIcon name="external" />
            View website
          </a>
        </nav>
      </header>

      <DashboardStats
        stats={[
          {
            label: 'Bookings today',
            value: todaysBookings,
            href: since('createdAt', startOfToday),
            icon: 'calendar',
            hint: 'Received since midnight',
          },
          {
            label: 'Pending bookings',
            value: pendingBookings,
            href: `${BOOKINGS}?where[status][equals]=pending`,
            icon: 'clock',
            hint: 'All confirmed',
            urgent: true,
          },
          {
            label: 'New quote requests',
            value: newQuotes,
            href: `${QUOTES}?where[status][equals]=new`,
            icon: 'inbox',
            hint: 'Inbox is clear',
            urgent: true,
          },
          {
            label: 'Departures this week',
            value: departures,
            href:
              `${since('dates.startDate', startOfToday)}` +
              `&where[dates.startDate][less_than]=${encodeURIComponent(inSevenDays.toISOString())}`,
            icon: 'plane',
            hint: 'Next 7 days',
          },
          {
            label: 'Revenue this month',
            value: revenue,
            format: 'currency',
            href: since('createdAt', startOfMonth),
            icon: 'wallet',
            hint: 'Excluding cancellations',
          },
        ]}
      />

      {bookings !== null || quotes !== null ? (
        <div className="it-panels">
          {bookings !== null ? <RecentBookings bookings={bookings} /> : null}
          {quotes !== null ? <RecentQuotes quotes={quotes} /> : null}
        </div>
      ) : null}
    </div>
  )
}

export default Dashboard
