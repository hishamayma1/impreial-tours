import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageHeader } from '@/components/layout/PageHeader'
import { CustomQuoteForm } from '@/components/booking/CustomQuoteForm'
import { CancellationPolicy } from '@/components/shared/CancellationPolicy'
import { Container } from '@/components/ui/Container'
import { locales, type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'
import { getSiteSettings } from '@/lib/payload/queries'
import { getTransferByType } from '@/lib/payload/services'

const PATH = '/transfers/custom'

export const generateStaticParams = () => locales.map((locale) => ({ locale }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> => {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'transfers.custom' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates(locale as Locale, PATH),
  }
}

const CustomTripPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, parent, quote, settings, s, transfer] = await Promise.all([
    getTranslations('transfers.custom'),
    getTranslations('transfers'),
    getTranslations('quote'),
    getSiteSettings(locale as Locale),
    getTranslations('services'),
    getTransferByType(locale as Locale, 'custom'),
  ])

  // SiteSettings.enableCustomQuote is the kill switch for this form (Section 3). The
  // route handler enforces it too, so turning it off closes both doors.
  const enabled = settings.enableCustomQuote !== false

  return (
    <div className="aurora">
      <PageHeader eyebrow={parent('title')} title={t('title')} description={t('description')} />

      <Container size="narrow" className="py-14 md:py-20">
        {enabled ? (
          <CustomQuoteForm />
        ) : (
          <div className="glass-panel rounded-2xl border-dashed p-10 text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              {quote('disabled')}
            </p>
          </div>
        )}
      </Container>

      <Container size="narrow" className="pb-14 md:pb-20">
        <div className="border-t border-hairline pt-12">
          <h2 className="mb-6 font-headline-section text-headline-section text-primary">
            {s('cancellationPolicy')}
          </h2>
          <CancellationPolicy override={transfer?.cancellationPolicy} />
        </div>
      </Container>
    </div>
  )
}

export default CustomTripPage
