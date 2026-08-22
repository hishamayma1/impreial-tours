import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageHeader } from '@/components/layout/PageHeader'
import { PhasePlaceholder } from '@/components/ui/PhasePlaceholder'
import { locales, type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'

const PATH = '/transfers/airport'

/** Pre-render this route for all three languages. */
export const generateStaticParams = () => locales.map((locale) => ({ locale }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> => {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'transfers.airport' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates(locale as Locale, PATH),
  }
}

const AirportTransferPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('transfers.airport')
  const eyebrow = await getTranslations('transfers')
  const common = await getTranslations('common')

  return (
    <>
      <PageHeader
        eyebrow={eyebrow('title')}
        title={t('title')}
        description={t('description')}
      />
      <PhasePlaceholder note={common('comingSoon')} />
    </>
  )
}

export default AirportTransferPage
