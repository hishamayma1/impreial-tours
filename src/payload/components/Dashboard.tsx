import type { ServerProps } from 'payload'

import { DashboardStats } from './DashboardStats'

/**
 * Rendered above the admin dashboard's collection list. A server component, so the
 * counts are read through the Local API with no client round trip.
 *
 * Every figure is scoped by the viewer's own access: `overrideAccess: false` with the
 * request user means an editor (who cannot see Bookings at all) gets zeros rather
 * than a leak of sales data through a summary card.
 */
export const Dashboard = async ({ payload, user }: ServerProps) => {
  if (!payload || !user) return null

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1)

  const inSevenDays = new Date(startOfToday)
  inSevenDays.setDate(inSevenDays.getDate() + 7)

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

  const [todaysBookings, pendingBookings, newQuotes, departures, revenue] = await Promise.all([
    safeCount('bookings', { createdAt: { greater_than_equal: startOfToday.toISOString() } }),
    safeCount('bookings', { status: { equals: 'pending' } }),
    safeCount('quote-requests', { status: { equals: 'new' } }),
    safeCount('bookings', {
      'dates.startDate': {
        greater_than_equal: startOfToday.toISOString(),
        less_than_equal: inSevenDays.toISOString(),
      },
    }),
    revenueThisMonth(),
  ])

  return (
    <DashboardStats
      stats={[
        { label: 'Bookings today', value: todaysBookings, href: '/admin/collections/bookings' },
        {
          label: 'Pending bookings',
          value: pendingBookings,
          href: '/admin/collections/bookings?where[status][equals]=pending',
        },
        {
          label: 'New quote requests',
          value: newQuotes,
          href: '/admin/collections/quote-requests?where[status][equals]=new',
        },
        {
          label: 'Departures this week',
          value: departures,
          href: '/admin/collections/bookings',
        },
        {
          label: 'Revenue this month',
          value: revenue,
          format: 'currency',
          href: '/admin/collections/bookings',
        },
      ]}
    />
  )
}

export default Dashboard
