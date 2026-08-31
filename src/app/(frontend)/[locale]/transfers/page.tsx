import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageHeader } from '@/components/layout/PageHeader'
import { Container } from '@/components/ui/Container'
import { Icon, type IconName } from '@/components/ui/Icon'
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

  // A glyph per product, so the three cards are distinguishable before they are read.
  const ICONS: Record<(typeof options)[number]['key'], IconName> = {
    airport: 'globe',
    intercity: 'pin',
    custom: 'sparkle',
  }

  return (
    <div className="aurora">
      <PageHeader title={t('title')} description={t('description')} />

      <Container className="py-16 md:py-20">
        {/* Staggered, so the three options arrive in sequence rather than as a block. */}
        <div className="stagger grid gap-grid-gutter md:grid-cols-3">
          {options.map((option, index) => (
            <Link
              key={option.key}
              href={option.href}
              style={{ '--i': index } as React.CSSProperties}
              className="glass-panel group flex flex-col rounded-2xl p-8 card-lift hover:border-brand/30 hover:shadow-widget focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <span className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-brand/[0.07] text-brand transition-colors duration-200 group-hover:bg-brand group-hover:text-on-primary">
                <Icon name={ICONS[option.key]} className="h-5 w-5" />
              </span>
              <h2 className="font-headline-card text-headline-card text-primary transition-colors group-hover:text-brand">
                {t(`${option.key}.title`)}
              </h2>
              <p className="mt-3 flex-1 font-body-md text-body-md text-on-surface-variant">
                {t(`${option.key}.description`)}
              </p>
              <span
                aria-hidden
                className="mt-6 inline-flex items-center gap-2 font-body-md text-caption text-brand transition-transform duration-200 group-hover:translate-x-0.5"
              >
                <Icon name="arrow-right" className="h-4 w-4 rtl:rotate-180" />
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  )
}

export default TransfersPage
