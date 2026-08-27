import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageHeader } from '@/components/layout/PageHeader'
import { PhasePlaceholder } from '@/components/ui/PhasePlaceholder'
import { locales, type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'

const PATH = '/about'

/** Pre-render this route for all three languages. */
export const generateStaticParams = () => locales.map((locale) => ({ locale }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> => {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'pages.about' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates(locale as Locale, PATH),
    /**
     * Still a placeholder. Indexing a heading over a "coming soon" note spends crawl
     * budget on nothing and drags on site-wide quality signals, so it stays out of
     * the index until it has real content. The page remains fully reachable to
     * visitors; delete this block and restore the sitemap entry when it does.
     */
    robots: { index: false, follow: true },
  }
}

const AboutPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('pages.about')
  const common = await getTranslations('common')

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
      />
      <PhasePlaceholder note={common('comingSoon')} />
    </>
  )
}

export default AboutPage
