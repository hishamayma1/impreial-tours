import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { TransferBookingForm } from '@/components/transfers/TransferBookingForm'
import {
  TransferHero,
  TransferSection,
  FleetGrid,
  PriceCard,
} from '@/components/transfers/TransferShell'
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

/** Minutes into a readable "3 h 20" without pulling in a formatting library. */
const duration = (minutes: number | null): string => {
  if (!minutes) return ''
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours ? `${hours} h${rest ? ` ${rest}` : ''}` : `${rest} min`
}

const IntercityTransferPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  setRequestLocale(locale)

  const [transfer, settings, t, f, parent] = await Promise.all([
    getTransferByType(locale as Locale, 'intercity'),
    getSiteSettings(locale as Locale),
    getTranslations('transfers.intercity'),
    getTranslations('transfers.form'),
    getTranslations('transfers'),
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

      {transfer?.vehicles.length ? (
        <TransferSection title={f('fleetTitle')}>
          <FleetGrid vehicles={transfer.vehicles} />
        </TransferSection>
      ) : null}

      {transfer?.routes.length ? (
        <TransferSection title={f('routesTitle')} className="border-t border-hairline">
          <div className="stagger grid gap-5 lg:grid-cols-2">
            {transfer.routes.map((route, index) => (
              <PriceCard
                key={route.id}
                index={index}
                title={`${route.fromCity} → ${route.toCity}`}
                meta={[
                  route.distanceKm ? `${route.distanceKm} km` : '',
                  duration(route.estimatedDurationMin),
                ]
                  .filter(Boolean)
                  .join(' · ')}
                note={route.note}
                pricing={route.vehiclePricing}
                currencies={settings.currencies}
              />
            ))}
          </div>
        </TransferSection>
      ) : null}

      {!transfer ? <PhasePlaceholder note={t('description')} /> : null}
    </div>
  )
}

export default IntercityTransferPage
