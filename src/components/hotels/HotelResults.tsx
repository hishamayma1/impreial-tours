import { getTranslations } from 'next-intl/server'

import { JsonLd } from '@/components/seo/JsonLd'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getHotelListing, parseHotelFilters, hasActiveHotelFilters } from '@/lib/payload/hotels'
import { getSiteSettings } from '@/lib/payload/queries'
import { itemListNode } from '@/lib/structured-data'
import { cn } from '@/lib/utils'

import { HotelCard } from './HotelCard'
import { HotelSort } from './HotelSort'

type SearchQuery = Record<string, string | string[] | undefined>

const BASE_PATH = '/hotels'

/** Rebuilds the listing URL for a page, carrying every other filter with it. */
const pageHref = (query: SearchQuery, page: number): string => {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (key === 'page' || value === undefined) continue
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry) params.append(key, entry)
    }
  }
  if (page > 1) params.set('page', String(page))

  const search = params.toString()
  return search ? `${BASE_PATH}?${search}` : BASE_PATH
}

/**
 * The data half of the hotels listing, behind its own Suspense boundary so the hero
 * and the filter bar stream while this is still waiting on the database.
 */
export const HotelResults = async ({
  locale,
  query,
}: {
  locale: Locale
  query: SearchQuery
}) => {
  const filters = parseHotelFilters(query)

  const [data, settings, t, h] = await Promise.all([
    getHotelListing(locale, filters),
    getSiteSettings(locale),
    getTranslations('services'),
    getTranslations('hotels'),
  ])

  const filtered = hasActiveHotelFilters(filters)

  const header = (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-5">
      {/* Announced politely: filtering swaps the list under a screen reader's feet. */}
      <p aria-live="polite" className="font-body-md text-body-md text-on-surface-variant">
        <span className="font-medium text-primary">
          {data.totalDocs === 1 ? h('resultOne') : h('resultMany', { count: String(data.totalDocs) })}
        </span>
      </p>
      <HotelSort />
    </div>
  )

  if (!data.items.length) {
    return (
      <Container className="py-10 md:py-14">
        {header}
        <div className="glass-panel mx-auto max-w-md rounded-2xl border-dashed p-12 text-center">
          <span
            aria-hidden
            className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full bg-surface-container text-outline"
          >
            <Icon name="search" className="h-5 w-5" />
          </span>
          <p className="font-headline-card text-headline-card text-primary">{h('emptyTitle')}</p>
          <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
            {/*
              An empty result means two different things: unfiltered, there are no
              hotels yet; filtered, this combination excluded all of them.
            */}
            {filtered ? h('emptyFiltered') : t('empty')}
          </p>
          {filtered ? (
            <Link
              href={BASE_PATH}
              className="focus-card mt-6 inline-flex h-11 items-center rounded-xl border border-brand px-5 font-body-md text-body-md text-brand transition-colors duration-200 hover:bg-brand hover:text-on-primary"
            >
              {h('clearFilters')}
            </Link>
          ) : null}
        </div>
      </Container>
    )
  }

  return (
    <Container className="py-10 md:py-14">
      {header}

      {/*
        Two across at most. These are wide cards with a photograph and a fact row, and
        a third column would shrink both below the size that makes them worth showing.
      */}
      <div className="stagger grid grid-cols-1 items-stretch gap-5 xl:grid-cols-2">
        {data.items.map((item, index) => (
          <HotelCard key={item.id} item={item} currencies={settings.currencies} index={index} />
        ))}
      </div>

      {data.totalPages > 1 ? (
        <nav
          aria-label={t('pagination')}
          className="mt-14 flex flex-wrap items-center justify-center gap-2"
        >
          {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((page) => (
            <Link
              key={page}
              href={pageHref(query, page)}
              aria-current={page === data.page ? 'page' : undefined}
              className={cn(
                'focus-card flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 font-body-md text-body-md tabular-nums transition-colors duration-200',
                page === data.page
                  ? 'border-brand bg-brand text-on-primary'
                  : 'border-hairline text-on-surface-variant hover:border-brand hover:text-brand',
              )}
            >
              {page}
            </Link>
          ))}
        </nav>
      ) : null}

      {/* Crawlers and answer engines read the listing order from the initial HTML. */}
      <JsonLd data={itemListNode(data.items, locale, BASE_PATH, h('title'))} />
    </Container>
  )
}
