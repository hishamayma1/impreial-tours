import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { HotelFilterBar } from '@/components/hotels/HotelFilterBar'
import { HotelResults } from '@/components/hotels/HotelResults'
import { HotelFiltersSkeleton, HotelGridSkeleton } from '@/components/hotels/HotelSkeletons'
import { Container } from '@/components/ui/Container'
import { locales, type Locale } from '@/i18n/routing'
import { hasActiveHotelFilters, parseHotelFilters } from '@/lib/payload/hotels'
import { buildAlternates } from '@/lib/seo'

const PATH = '/hotels'

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
  const t = await getTranslations({ locale, namespace: 'hotels' })

  const filtered = hasActiveHotelFilters(parseHotelFilters(query))

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

/**
 * The hotels listing.
 *
 * Nothing here awaits the database: the header renders from translations and streams
 * immediately, then the filter bar and the results fill two independent Suspense
 * boundaries. The results are keyed on the query so changing a filter shows the
 * skeleton rather than leaving stale cards on screen; the bar is not, so it updates
 * in place instead of blanking the control that was just used.
 */
const HotelsPage = async ({
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
  const t = await getTranslations('hotels')

  return (
    <div className="aurora">
      {/*
        A glass header rather than the shared PageHeader: this page has no single
        photograph to sit over, so the depth comes from the aurora wash behind a
        translucent panel instead of from an image the listing does not have.
      */}
      <header className="border-b border-white/40">
        <Container className="py-14 md:py-20">
          <div className="glass-panel max-w-3xl rounded-2xl p-8 md:p-10">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-container-lowest/70 px-3 py-1 font-label-caps text-label-caps uppercase tracking-widest text-brand">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
              {t('eyebrow')}
            </span>
            <h1 className="max-w-[18ch] font-display-hero text-display-hero-mobile leading-[1.08] text-primary md:text-[52px]">
              {t('title')}
            </h1>
            <p className="mt-5 max-w-[60ch] font-body-lg text-body-lg text-on-surface-variant">
              {t('description')}
            </p>
          </div>
        </Container>
      </header>

      <Suspense fallback={<HotelFiltersSkeleton />}>
        <HotelFilterBar locale={locale as Locale} />
      </Suspense>

      <Suspense key={JSON.stringify(query)} fallback={<HotelGridSkeleton />}>
        <HotelResults locale={locale as Locale} query={query} />
      </Suspense>
    </div>
  )
}

export default HotelsPage
