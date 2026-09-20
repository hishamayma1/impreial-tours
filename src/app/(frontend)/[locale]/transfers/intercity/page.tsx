import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { TransferBookingForm } from '@/components/transfers/TransferBookingForm'
import { TransferHero } from '@/components/transfers/TransferShell'
import { CancellationPolicy } from '@/components/shared/CancellationPolicy'
import { Container } from '@/components/ui/Container'
import { PhasePlaceholder } from '@/components/ui/PhasePlaceholder'
import { locales, type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'
import { getSiteSettings } from '@/lib/payload/queries'
import { getTransferByType } from '@/lib/payload/services'

const PATH = '/transfers/intercity'

export const generateStaticParams = () => locales.map((locale) => ({ locale }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> => {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'transfers.intercity' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates(locale as Locale, PATH),
  }
}

const IntercityTransferPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  setRequestLocale(locale)

  const [transfer, settings, t, f, parent, s] = await Promise.all([
    getTransferByType(locale as Locale, 'intercity'),
    getSiteSettings(locale as Locale),
    getTranslations('transfers.intercity'),
    getTranslations('transfers.form'),
    getTranslations('transfers'),
    getTranslations('services'),
  ])

  return (
    <div className="aurora">
      <TransferHero
        eyebrow={parent('title')}
        title={transfer?.title || t('title')}
        description={transfer?.description || t('description')}
        image={transfer?.heroImage ?? null}
        facts={[{ icon: 'wallet', label: f('fixedPrice') }]}
      />

      {transfer && transfer.routes.length ? (
        <Container className="relative z-10 -mt-12 md:-mt-16">
          <div className="mx-auto max-w-4xl">
            <TransferBookingForm
              transfer={transfer}
              variant="intercity"
              currencies={settings.currencies}
            />
          </div>
        </Container>
      ) : null}

      {!transfer ? <PhasePlaceholder note={t('description')} /> : null}

      {transfer ? (
        <Container className="py-12 md:py-16">
          <div className="mx-auto max-w-2xl border-t border-hairline pt-12">
            <h2 className="mb-6 font-headline-section text-headline-section text-primary">
              {s('cancellationPolicy')}
            </h2>
            <CancellationPolicy override={transfer.cancellationPolicy} />
          </div>
        </Container>
      ) : null}
    </div>
  )
}

export default IntercityTransferPage
