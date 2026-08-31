import { getTranslations } from 'next-intl/server'

import { JsonLd } from '@/components/seo/JsonLd'
import { Icon } from '@/components/ui/Icon'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getTourCatalog, parseCatalogFilters, hasActiveFilters } from '@/lib/payload/catalog'
import { getSiteSettings } from '@/lib/payload/queries'
import { mixedItemListNode } from '@/lib/structured-data'
import { cn } from '@/lib/utils'

import { CatalogCard } from './CatalogCard'
import { CatalogSort } from './CatalogSort'

type SearchQuery = Record<string, string | string[] | undefined>

const BASE_PATH = '/tours'

/**
 * Rebuilds the catalogue URL for a given page, carrying every other filter with it.
 *
 * Pagination links are plain `<a>`s rather than store writes, so they have to
 * reconstruct the query themselves — and they must not drop the filters, or page 2 of
 * a filtered search would silently be page 2 of the whole catalogue.
 */
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
 * Elides a long pager to first / last / a window around the current page.
 *
 * Forty pages of numbered links is a wall of digits nobody reads, and on a phone it
 * wraps into six rows above the footer. `null` marks a gap.
 */
const pageWindow = (current: number, total: number): Array<number | null> => {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)

  const pages = new Set([1, total, current, current - 1, current + 1])
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)

  return sorted.flatMap((page, index) =>
    index > 0 && page - sorted[index - 1] > 1 ? [null, page] : [page],
  )
}

/**
 * The data half of the catalogue, behind its own Suspense boundary.
 *
 * That split is the point: the hero, the filter rail and the footer render from
 * translations and cached option lists, and stream to the browser while this
 * component is still waiting on the database. Awaiting the results in the page itself
 * would put a database read in front of the first byte of every visit.
 */
export const CatalogResults = async ({
  locale,
  query,
}: {
  locale: Locale
  query: SearchQuery
}) => {
  const filters = parseCatalogFilters(query)

  // Results and settings are independent, so they overlap rather than queue.
  const [data, settings, t] = await Promise.all([
    getTourCatalog(locale, filters),
    getSiteSettings(locale),
    getTranslations('catalog'),
  ])

  const filtered = hasActiveFilters(filters)

  const countLabel =
    data.totalDocs === 0
      ? t('resultsNone')
      : data.totalDocs === 1
        ? t('resultsOne')
        : t('resultsMany', { count: String(data.totalDocs) })

  const header = (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-5">
      {/*
        Announced politely: filtering swaps the whole list under a screen reader's
        feet otherwise, with nothing said about what changed.
      */}
      <p aria-live="polite" className="font-body-md text-body-md text-on-surface-variant">
        <span className="font-medium text-primary">{countLabel}</span>
        {filters.q ? ` ${t('searchedFor', { query: filters.q })}` : null}
      </p>
      <CatalogSort />
    </div>
  )

  if (!data.items.length) {
    return (
      <>
        {header}
        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-hairline bg-surface-container-lowest p-12 text-center">
          <span
            aria-hidden
            className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full bg-surface-container text-outline"
          >
            <Icon name="search" className="h-5 w-5" />
          </span>
          <p className="font-headline-card text-headline-card text-primary">{t('emptyTitle')}</p>
          <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
            {/*
              An empty result means two different things and needs two different
              answers: unfiltered, the collection genuinely has nothing in it yet;
              filtered, there is plenty here and this combination excluded all of it.
            */}
            {filtered ? t('emptyBody') : t('emptyBodyUnfiltered')}
          </p>
          {filtered ? (
            // A plain link to the bare path rather than a button wired to the store:
            // this is a server component, and dropping the query string is exactly
            // what resetting the filters means.
            <Link
              href={BASE_PATH}
              className="focus-card mt-6 inline-flex h-11 items-center rounded-xl border border-brand px-5 font-body-md text-body-md text-brand transition-colors duration-200 hover:bg-brand hover:text-on-primary"
            >
              {t('emptyAction')}
            </Link>
          ) : null}
        </div>
      </>
    )
  }

  return (
    <>
      {header}

      <div className="grid grid-cols-1 items-stretch gap-grid-gutter sm:grid-cols-2 xl:grid-cols-3">
        {data.items.map((item, index) => (
          <CatalogCard
            key={item.id}
            item={item}
            currencies={settings.currencies}
            index={index}
          />
        ))}
      </div>

      {data.totalPages > 1 ? (
        <nav
          aria-label={t('page', { page: String(data.page), total: String(data.totalPages) })}
          className="mt-14 flex flex-wrap items-center justify-center gap-2"
        >
          {data.page > 1 ? (
            <Link
              href={pageHref(query, data.page - 1)}
              rel="prev"
              className="focus-card flex h-11 items-center gap-1.5 rounded-xl border border-hairline px-4 font-body-md text-body-md text-on-surface-variant transition-colors duration-200 hover:border-brand hover:text-brand"
            >
              <Icon name="chevron-left" className="h-4 w-4 rtl:rotate-180" />
              {t('previous')}
            </Link>
          ) : null}

          {pageWindow(data.page, data.totalPages).map((page, index) =>
            page === null ? (
              <span
                key={`gap-${index}`}
                aria-hidden
                className="px-1 font-body-md text-body-md text-outline"
              >
                …
              </span>
            ) : (
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
            ),
          )}

          {data.page < data.totalPages ? (
            <Link
              href={pageHref(query, data.page + 1)}
              rel="next"
              className="focus-card flex h-11 items-center gap-1.5 rounded-xl border border-hairline px-4 font-body-md text-body-md text-on-surface-variant transition-colors duration-200 hover:border-brand hover:text-brand"
            >
              {t('next')}
              <Icon name="chevron-right" className="h-4 w-4 rtl:rotate-180" />
            </Link>
          ) : null}
        </nav>
      ) : null}

      {/* Crawlers and answer engines read the listing order from the initial HTML. */}
      <JsonLd data={mixedItemListNode(data.items, locale, t('title'))} />
    </>
  )
}
