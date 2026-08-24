import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageHeader } from '@/components/layout/PageHeader'
import { DetailSection, CheckList } from '@/components/services/DetailSection'
import { PhasePlaceholder } from '@/components/ui/PhasePlaceholder'
import { Price } from '@/components/ui/Price'
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

  const [transfer, settings, t, s, parent] = await Promise.all([
    getTransferByType(locale as Locale, 'intercity'),
    getSiteSettings(locale as Locale),
    getTranslations('transfers.intercity'),
    getTranslations('services'),
    getTranslations('transfers'),
  ])

  return (
    <>
      <PageHeader
        eyebrow={parent('title')}
        title={transfer?.title || t('title')}
        description={transfer?.description || t('description')}
      />

      {transfer?.vehicles.length ? (
        <DetailSection title={s('vehicles')}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {transfer.vehicles.map((vehicle) => (
              <li
                key={vehicle.className}
                className="rounded-xl border border-hairline bg-surface-container-lowest p-5"
              >
                <h3 className="font-headline-card text-headline-card text-primary">
                  {vehicle.className}
                </h3>
                <p className="mt-2 font-body-md text-caption text-on-surface-variant">
                  {vehicle.maxPassengers} {s('passengers')} · {vehicle.maxLuggage} {s('luggage')}
                </p>
                <CheckList items={vehicle.features} />
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}

      {transfer?.routes.length ? (
        <DetailSection title={s('routes')}>
          <div className="space-y-6">
            {transfer.routes.map((route) => (
              <article
                key={`${route.fromCity}-${route.toCity}`}
                className="rounded-xl border border-hairline bg-surface-container-lowest p-6"
              >
                <h3 className="font-headline-card text-headline-card text-primary">
                  {route.fromCity} → {route.toCity}
                </h3>
                <p className="mt-2 font-body-md text-caption text-on-surface-variant">
                  {route.distanceKm ? `${route.distanceKm} km` : ''}
                  {route.estimatedDurationMin
                    ? ` · ${Math.round(route.estimatedDurationMin / 60)} h`
                    : ''}
                </p>
                <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
                  {route.vehiclePricing.map((price) => (
                    <li
                      key={price.vehicleClass}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <span className="font-body-md text-body-md text-on-surface-variant">
                        {price.vehicleClass}
                        {price.maxPassengers ? ` · ${price.maxPassengers} ${s('passengers')}` : ''}
                      </span>
                      <Price
                        amount={price.price}
                        currencies={settings.currencies}
                        className="font-headline-card text-headline-card text-primary"
                      />
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </DetailSection>
      ) : null}

      {!transfer ? <PhasePlaceholder note={s('empty')} /> : null}
    </>
  )
}

export default IntercityTransferPage
