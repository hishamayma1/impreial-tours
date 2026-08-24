import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageHeader } from '@/components/layout/PageHeader'
import { ServiceGrid } from '@/components/services/ServiceGrid'
import { locales, type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'
import { getSiteSettings } from '@/lib/payload/queries'
import { getBicycles } from '@/lib/payload/services'

const PATH = '/bicycles'

export const generateStaticParams = () => locales.map((locale) => ({ locale }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> => {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'bicycles' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates(locale as Locale, PATH),
  }
}

const BicyclesPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}) => {
  const { locale } = await params
  // The URL is the source of truth for paging and filters (spec Section 6), so the
  // page reads searchParams rather than any client store.
  const { page } = await searchParams
  setRequestLocale(locale)

  const t = await getTranslations('bicycles')

  const [data, settings] = await Promise.all([
    getBicycles(locale as Locale, undefined, { page: Number(page) || 1 }),
    getSiteSettings(locale as Locale),
  ])

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
      />
      <ServiceGrid data={data} basePath="/bicycles" currencies={settings.currencies} />
    </>
  )
}

export default BicyclesPage
