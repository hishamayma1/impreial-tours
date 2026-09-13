import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { TransferBookingForm } from '@/components/transfers/TransferBookingForm'
import { TransferHero } from '@/components/transfers/TransferShell'
import { Container } from '@/components/ui/Container'
import { PhasePlaceholder } from '@/components/ui/PhasePlaceholder'
import { locales, type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'
import { getSiteSettings } from '@/lib/payload/queries'
import { getTransferByType } from '@/lib/payload/services'

const PATH = '/transfers/airport'

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

  const [transfer, settings, t, f, parent] = await Promise.all([
    getTransferByType(locale as Locale, 'airport'),
    getSiteSettings(locale as Locale),
    getTranslations('transfers.airport'),
    getTranslations('transfers.form'),
    getTranslations('transfers'),
  ])

  // Only facts the document actually carries — an unconfigured transfer gets a clean
  // hero rather than a row of defaults dressed up as promises.
  const facts = [
    { icon: 'wallet' as const, label: f('fixedPrice') },
    transfer?.meetAndGreet ? { icon: 'users' as const, label: f('meetAndGreet') } : null,
    transfer?.freeWaitingMinutes
      ? {
          icon: 'clock' as const,
          label: f('freeWaiting', { minutes: String(transfer.freeWaitingMinutes) }),
        }
      : null,
  ].filter((fact): fact is NonNullable<typeof fact> => Boolean(fact))

  return (
    <div className="aurora">
      <TransferHero
        eyebrow={parent('title')}
        title={transfer?.title || t('title')}
        description={transfer?.description || t('description')}
        image={transfer?.heroImage ?? null}
        facts={facts}
      />

      {/*
        The form overlaps the hero's foot by a negative margin, so it reads as sitting
        on the photograph rather than beneath it — which is the whole point of the
        glass, and also puts the first decision above the fold.
      */}
      {transfer && transfer.zones.length ? (
        <Container className="relative z-10 -mt-12 md:-mt-16">
          <div className="mx-auto max-w-4xl">
            <TransferBookingForm
              transfer={transfer}
              variant="airport"
              currencies={settings.currencies}
            />
          </div>
        </Container>
      ) : null}

      {!transfer ? <PhasePlaceholder note={t('description')} /> : null}
    </div>
  )
}

export default AirportTransferPage
