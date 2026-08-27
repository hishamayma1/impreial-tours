import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ListingHero } from '@/components/services/ListingHero'
import { ListingFilterBar } from '@/components/services/ListingFilterBar'
import { ServiceResults } from '@/components/services/ServiceResults'
import { ServiceGridSkeleton, ListingFiltersSkeleton } from '@/components/services/ServiceSkeletons'
import { locales, type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'

const PATH = '/tours/daily'

export const generateStaticParams = () => locales.map((locale) => ({ locale }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> => {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'tours.daily' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates(locale as Locale, PATH),
  }
}

const DailyToursPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) => {
  const { locale } = await params
  setRequestLocale(locale)

  // The URL is the source of truth for paging and filters (spec Section 6).
  const query = await searchParams
  const t = await getTranslations('tours.daily')
  const eyebrow = await getTranslations('tours')

  return (
    <>
      <ListingHero
        eyebrow={eyebrow('eyebrow')}
        title={t('title')}
        description={t('description')}
      />
      <Suspense fallback={<ListingFiltersSkeleton />}>
        <ListingFilterBar variant="tours" locale={locale as Locale} />
      </Suspense>

      {/*
        Keyed on the query so changing a filter shows the skeleton again rather than
        leaving stale results on screen while the new ones load.
      */}
      <Suspense key={JSON.stringify(query)} fallback={<ServiceGridSkeleton />}>
        <ServiceResults kind="daily" locale={locale as Locale} query={query} listName={t('title')} />
      </Suspense>
    </>
  )
}

export default DailyToursPage
