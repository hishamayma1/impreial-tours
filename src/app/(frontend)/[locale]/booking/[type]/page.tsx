import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageHeader } from '@/components/layout/PageHeader'
import { BookingWizard } from '@/components/booking/BookingWizard'
import { locales, type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'
import { getSiteSettings } from '@/lib/payload/queries'

const PATH = '/booking'

/** The four checkout shapes the wizard knows how to render. */
const TYPES = ['tour', 'hotel', 'car', 'bike'] as const
type BookingType = (typeof TYPES)[number]

type PageParams = { locale: string; type: string }

export const generateStaticParams = () =>
  locales.flatMap((locale) => TYPES.map((type) => ({ locale, type })))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> => {
  const { locale, type } = await params
  const t = await getTranslations({ locale, namespace: 'booking' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates(locale as Locale, `${PATH}/${type}`),
    // Checkout has nothing to offer a search engine and should never be indexed.
    robots: { index: false, follow: false },
  }
}

const BookingPage = async ({ params }: { params: Promise<PageParams> }) => {
  const { locale, type } = await params
  setRequestLocale(locale)

  if (!TYPES.includes(type as BookingType)) notFound()

  const [t, settings] = await Promise.all([
    getTranslations('booking'),
    getSiteSettings(locale as Locale),
  ])

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <BookingWizard serviceType={type} currencies={settings.currencies} />
    </>
  )
}

export default BookingPage
