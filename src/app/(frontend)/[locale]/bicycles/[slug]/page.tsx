import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { DetailHero } from '@/components/services/DetailHero'
import { DetailSection, CheckList, FactRow } from '@/components/services/DetailSection'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Price } from '@/components/ui/Price'
import { locales, type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'
import { getSiteSettings } from '@/lib/payload/queries'
import { getBicycleBySlug, getAllSlugs, getAlternateSlugs } from '@/lib/payload/services'

const PATH = '/bicycles'
type PageParams = { locale: string; slug: string }

export const generateStaticParams = async () => {
  const params: PageParams[] = []
  for (const locale of locales) {
    const slugs = await getAllSlugs('bicycles', locale)
    params.push(...slugs.map((slug) => ({ locale, slug })))
  }
  return params
}

export const generateMetadata = async ({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> => {
  const { locale, slug } = await params
  const bike = await getBicycleBySlug(locale as Locale, slug)
  if (!bike) return {}

  const alternates = await getAlternateSlugs('bicycles', locale as Locale, slug)

  return {
    title: bike.title,
    description: bike.description,
    alternates: buildAlternates(locale as Locale, PATH, alternates),
    openGraph: { images: bike.image ? [bike.image.url] : [] },
  }
}

const BicycleDetailPage = async ({ params }: { params: Promise<PageParams> }) => {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const [bike, settings, t, bikesT] = await Promise.all([
    getBicycleBySlug(locale as Locale, slug),
    getSiteSettings(locale as Locale),
    getTranslations('services'),
    getTranslations('bicycles'),
  ])

  if (!bike) notFound()

  const isRental = bike.bikeType === 'rental'

  return (
    <>
      <DetailHero
        eyebrow={bikesT('title')}
        title={bike.title}
        summary={bike.description}
        image={bike.image}
      />

      <DetailSection>
        <FactRow
          facts={
            isRental
              ? [
                  { label: t('specs'), value: bike.bikeModel },
                  { label: 'e-bike', value: bike.specs.electric ? '✓' : '' },
                  { label: t('deposit'), value: bike.deposit ? String(bike.deposit) : '' },
                ]
              : [
                  { label: t('route'), value: bike.routeName },
                  { label: 'km', value: bike.distanceKm ? String(bike.distanceKm) : '' },
                  {
                    label: t('difficultyLabel'),
                    value: bike.difficulty ? t(`difficulty.${bike.difficulty}`) : '',
                  },
                  {
                    label: t('duration'),
                    value: bike.durationHours ? `${bike.durationHours} h` : '',
                  },
                ]
          }
        />
      </DetailSection>

      {isRental && bike.rentalPricing.length ? (
        <DetailSection title={t('duration')}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {bike.rentalPricing.map((band) => (
              <li
                key={band.durationLabel}
                className="rounded-xl border border-hairline bg-surface-container-lowest p-5"
              >
                <p className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                  {band.durationLabel}
                </p>
                <p className="mt-2 font-headline-card text-headline-card text-primary">
                  <Price amount={band.price} currencies={settings.currencies} />
                </p>
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}

      {isRental && bike.includedAccessories.length ? (
        <DetailSection title={t('accessories')}>
          <CheckList items={bike.includedAccessories} />
        </DetailSection>
      ) : null}

      {!isRental && bike.routePlan.length ? (
        <DetailSection title={t('stops')}>
          <ol className="space-y-6">
            {bike.routePlan.map((stop) => (
              <li key={stop.stopName} className="border-l-2 border-hairline pl-6">
                <p className="mb-1 font-label-caps text-label-caps uppercase tracking-widest text-brand">
                  {stop.distanceFromStartKm !== null ? `${stop.distanceFromStartKm} km` : ''}
                </p>
                <h3 className="font-headline-card text-headline-card text-primary">
                  {stop.stopName}
                </h3>
                <p className="mt-2 max-w-2xl font-body-md text-body-md text-on-surface-variant">
                  {stop.stopDescription}
                </p>
              </li>
            ))}
          </ol>
        </DetailSection>
      ) : null}

      <Container className="py-14">
        <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-hairline bg-surface-container-low p-8 md:flex-row md:items-center">
          {!isRental && bike.pricePerPerson !== null ? (
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t('from')}{' '}
              <Price
                amount={bike.pricePerPerson}
                currencies={settings.currencies}
                className="font-headline-section text-headline-section text-primary"
              />
            </p>
          ) : null}
          <ButtonLink href={`/booking/bike?item=${bike.slug}`} variant="navy" size="lg">
            {t('bookNow')}
          </ButtonLink>
        </div>
      </Container>
    </>
  )
}

export default BicycleDetailPage
