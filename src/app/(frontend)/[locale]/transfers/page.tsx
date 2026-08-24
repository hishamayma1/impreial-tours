import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageHeader } from '@/components/layout/PageHeader'
import { Container } from '@/components/ui/Container'
import { Link } from '@/i18n/navigation'
import { locales, type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'

const PATH = '/transfers'

export const generateStaticParams = () => locales.map((locale) => ({ locale }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> => {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'transfers' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates(locale as Locale, PATH),
  }
}

const TransfersPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('transfers')

  // The hub is a static signpost to the three transfer products; the priced data
  // lives on each child page.
  const options = [
    { key: 'airport', href: '/transfers/airport' },
    { key: 'intercity', href: '/transfers/intercity' },
    { key: 'custom', href: '/transfers/custom' },
  ] as const

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />

      <Container className="py-16 md:py-20">
        <div className="grid gap-grid-gutter md:grid-cols-3">
          {options.map((option) => (
            <Link
              key={option.key}
              href={option.href}
              className="group rounded-xl border border-hairline bg-surface-container-lowest p-8 transition-shadow duration-300 hover:shadow-nav"
            >
              <h2 className="font-headline-card text-headline-card text-primary transition-colors group-hover:text-brand">
                {t(`${option.key}.title`)}
              </h2>
              <p className="mt-4 font-body-md text-body-md text-on-surface-variant">
                {t(`${option.key}.description`)}
              </p>
            </Link>
          ))}
        </div>
      </Container>
    </>
  )
}

export default TransfersPage
