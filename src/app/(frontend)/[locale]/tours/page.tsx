import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CatalogFilterPanel } from '@/components/services/CatalogFilterPanel'
import { CatalogResults } from '@/components/services/CatalogResults'
import {
  CatalogGridSkeleton,
  CatalogSidebarSkeleton,
} from '@/components/services/CatalogSkeletons'
import { ListingHero } from '@/components/services/ListingHero'
import { Container } from '@/components/ui/Container'
import { locales, type Locale } from '@/i18n/routing'
import { hasActiveFilters, parseCatalogFilters } from '@/lib/payload/catalog'
import { buildAlternates } from '@/lib/seo'

const PATH = '/tours'

type SearchQuery = Record<string, string | string[] | undefined>

export const generateStaticParams = () => locales.map((locale) => ({ locale }))

export const generateMetadata = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<SearchQuery>
}): Promise<Metadata> => {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  const t = await getTranslations({ locale, namespace: 'catalog' })

  const filtered = hasActiveFilters(parseCatalogFilters(query))

  return {
    title: t('title'),
    description: t('description'),
    // Every filter combination is a URL, which is the point — it is also, to a
    // crawler, a near-duplicate of this page with a different query string. The
    // canonical always points at the bare catalogue, and a filtered view asks not to
    // be indexed while still being followed through to the tours themselves.
    alternates: buildAlternates(locale as Locale, PATH),
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  }
}

/**
 * The combined catalogue: every day tour and full experience in one filterable list.
 *
 * The page is a shell. It renders the hero from translations alone and streams it
 * immediately, then fills two independent Suspense boundaries — the filter rail and
 * the results — as their queries resolve. Nothing here awaits the database, so the
 * first byte does not wait for Mongo, and a slow results query cannot hold up the
 * filters a visitor is reaching for.
 *
 * The two boundaries are keyed differently on purpose. The results are keyed on the
 * query, so changing a filter shows the skeleton again rather than leaving stale
 * cards on screen; the rail is not, so it updates its counts in place instead of
 * blanking the control that was just clicked.
 */
const ToursCatalogPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<SearchQuery>
}) => {
  const { locale } = await params
  setRequestLocale(locale)

  // The URL is the source of truth for paging and filters (spec Section 6).
  const query = await searchParams
  const t = await getTranslations('catalog')

  return (
    <>
      <ListingHero eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />

      <Container size="wide" className="py-10 md:py-14">
        {/*
          A fixed 19rem rail against a fluid results column. Fixed because a filter
          label should not reflow every time the grid beside it changes width, and
          `minmax(0, 1fr)` because a bare `1fr` grid track refuses to shrink below its
          content — which is how a single long tour title gives the whole page a
          horizontal scrollbar.
        */}
        <div className="grid grid-cols-1 gap-x-12 gap-y-0 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <Suspense fallback={<CatalogSidebarSkeleton />}>
            <CatalogFilterPanel locale={locale as Locale} query={query} />
          </Suspense>

          <div className="min-w-0">
            <Suspense key={JSON.stringify(query)} fallback={<CatalogGridSkeleton />}>
              <CatalogResults locale={locale as Locale} query={query} />
            </Suspense>
          </div>
        </div>
      </Container>
    </>
  )
}

export default ToursCatalogPage
