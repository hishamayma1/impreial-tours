import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageHeader } from '@/components/layout/PageHeader'
import { ServiceGrid } from '@/components/services/ServiceGrid'
import { ListingFilters } from '@/components/services/ListingFilters'
import { locales, type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'
import { getSiteSettings } from '@/lib/payload/queries'
import { getTours } from '@/lib/payload/services'

const PATH = '/tours/experiences'

export const generateStaticParams = () => locales.map((locale) => ({ locale }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> => {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'tours.experiences' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates(locale as Locale, PATH),
  }
}

const ExperiencesPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) => {
  const { locale } = await params
  // The URL is the source of truth for paging and filters (spec Section 6), so the
  // page reads searchParams rather than any client store.
  const query = await searchParams
  setRequestLocale(locale)

  const one = (key: string) => {
    const value = query[key]
    return Array.isArray(value) ? value[0] : value
  }
  const numeric = (key: string) => {
    const value = Number(one(key))
    return Number.isFinite(value) && value > 0 ? value : undefined
  }

  const filters = {
    page: Number(one('page')) || 1,
    difficulty: one('difficulty'),
    starRating: numeric('starRating'),
    minPrice: numeric('minPrice'),
    maxPrice: numeric('maxPrice'),
    sortBy: one('sortBy'),
  }

  const t = await getTranslations('tours.experiences')
  const eyebrow = await getTranslations('tours')

  const [data, settings] = await Promise.all([
    getTours(locale as Locale, 'experience', filters),
    getSiteSettings(locale as Locale),
  ])

  return (
    <>
      <PageHeader
        eyebrow={eyebrow('eyebrow')}
        title={t('title')}
        description={t('description')}
      />
      <ListingFilters variant="tours" />
      <ServiceGrid data={data} basePath="/tours/experiences" currencies={settings.currencies} />
    </>
  )
}

export default ExperiencesPage
