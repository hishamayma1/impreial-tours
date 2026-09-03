import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { BicycleFilterPanel } from '@/components/bicycles/BicycleFilterPanel'
import { BicycleResults } from '@/components/bicycles/BicycleResults'
import { BicycleResultsPending } from '@/components/bicycles/BicycleResultsPending'
import {
  BicycleFiltersSkeleton,
  BicycleGridSkeleton,
} from '@/components/bicycles/BicycleSkeletons'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { locales, type Locale } from '@/i18n/routing'
import { hasActiveBicycleFilters, parseBicycleFilters } from '@/lib/payload/bicycles'
import { buildAlternates } from '@/lib/seo'

const PATH = '/bicycles'

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
  const t = await getTranslations({ locale, namespace: 'bicycles' })

  const filtered = hasActiveBicycleFilters(parseBicycleFilters(query))

  return {
    title: t('title'),
    description: t('description'),
    // Every filter combination is a URL, which is the point — and, to a crawler, a
    // near-duplicate of this page. The canonical stays on the bare listing and a
    // filtered view asks not to be indexed while still being followed through.
    alternates: buildAlternates(locale as Locale, PATH),
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  }
}

/** The three promises the header makes, drawn from the collection's own vocabulary. */
const PROMISES = [
  { icon: 'clock' as const, key: 'promiseTime' as const },
  { icon: 'bolt' as const, key: 'promiseFleet' as const },
  { icon: 'shield' as const, key: 'promiseIncluded' as const },
]

/**
 * The bicycles listing.
 *
 * Nothing here awaits the database: the header renders from translations alone and
 * streams immediately, then the filter rail and the results fill two independent
 * Suspense boundaries. The results are keyed on the query so changing a filter shows
 * the skeleton rather than leaving stale cards on screen; the rail is not, so it
 * updates its counts in place instead of blanking the control that was just clicked.
 */
const BicyclesPage = async ({
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
  const t = await getTranslations('bicycles')

  return (
    <div className="aurora">
      <header className="border-b border-white/40">
        <Container className="py-14 md:py-20">
          <div className="glass-panel max-w-3xl rounded-2xl p-8 md:p-10">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-container-lowest/70 px-3 py-1 font-label-caps text-label-caps uppercase tracking-widest text-brand">
              <Icon name="bike" className="h-3.5 w-3.5" />
              {t('eyebrow')}
            </span>
            <h1 className="max-w-[18ch] font-display-hero text-display-hero-mobile leading-[1.08] text-primary md:text-[52px]">
              {t('title')}
            </h1>
            <p className="mt-5 max-w-[60ch] font-body-lg text-body-lg text-on-surface-variant">
              {t('description')}
            </p>

            {/*
              Three plain statements rather than a marketing rail. The middle one names
              the thing this page does that the others do not — you choose the hours —
              which is the whole reason someone lands here rather than on a tour page.
            */}
            <ul className="mt-8 grid gap-4 border-t border-hairline pt-6 sm:grid-cols-3">
              {PROMISES.map((promise) => (
                <li key={promise.key} className="flex items-start gap-2.5">
                  <Icon name={promise.icon} className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span className="font-body-md text-caption text-on-surface-variant">
                    {t(promise.key)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </header>

      <Container size="wide" className="py-10 md:py-14">
        {/*
          A fixed 19rem rail against a fluid results column. Fixed because a filter
          label should not reflow every time the grid beside it changes width, and
          `minmax(0, 1fr)` because a bare `1fr` grid track refuses to shrink below its
          content — which is how one long bike name gives the whole page a horizontal
          scrollbar.
        */}
        <div className="grid grid-cols-1 gap-x-12 gap-y-0 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <Suspense fallback={<BicycleFiltersSkeleton />}>
            <BicycleFilterPanel locale={locale as Locale} query={query} />
          </Suspense>

          <div className="min-w-0">
            <BicycleResultsPending>
              <Suspense key={JSON.stringify(query)} fallback={<BicycleGridSkeleton />}>
                <BicycleResults locale={locale as Locale} query={query} />
              </Suspense>
            </BicycleResultsPending>
          </div>
        </div>
      </Container>
    </div>
  )
}

export default BicyclesPage
