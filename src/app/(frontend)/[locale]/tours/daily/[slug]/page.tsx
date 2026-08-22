import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { DetailHero } from '@/components/services/DetailHero'
import { DetailSection, CheckList, FactRow } from '@/components/services/DetailSection'
import { RichText } from '@/components/ui/RichText'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Price } from '@/components/ui/Price'
import { locales, type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'
import { getSiteSettings } from '@/lib/payload/queries'
import { getTourBySlug, getAllSlugs, getAlternateSlugs } from '@/lib/payload/services'

const PATH = '/tours/daily'
type PageParams = { locale: string; slug: string }

/** Section 8: pre-render every locale x slug. */
export const generateStaticParams = async () => {
  const params: PageParams[] = []
  for (const locale of locales) {
    const slugs = await getAllSlugs('tours', locale, { tourType: { equals: 'daily' } })
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
  const tour = await getTourBySlug(locale as Locale, slug, 'daily')
  if (!tour) return {}

  // Each hreflang points at that language's own slug, so switching language keeps
  // the visitor on the same tour.
  const alternates = await getAlternateSlugs('tours', locale as Locale, slug)

  return {
    title: tour.title,
    description: tour.shortDescription,
    alternates: buildAlternates(locale as Locale, PATH, alternates),
    openGraph: { images: tour.heroImage ? [tour.heroImage.url] : [] },
  }
}

const DailyTourDetailPage = async ({ params }: { params: Promise<PageParams> }) => {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const [tour, settings, t, eyebrow] = await Promise.all([
    getTourBySlug(locale as Locale, slug, 'daily'),
    getSiteSettings(locale as Locale),
    getTranslations('services'),
    getTranslations('tours'),
  ])

  if (!tour) notFound()

  return (
    <>
      <DetailHero
        eyebrow={eyebrow('daily.title')}
        title={tour.title}
        summary={tour.shortDescription}
        image={tour.heroImage}
      />

      <DetailSection>
        <FactRow
          facts={[
            { label: t('duration'), value: tour.durationHours ? `${tour.durationHours} h` : '' },
            {
              label: t('difficultyLabel'),
              value: tour.difficulty ? t(`difficulty.${tour.difficulty}`) : '',
            },
            { label: t('meetingPoint'), value: tour.meetingPoint },
            {
              label: t('groupSize'),
              value: tour.groupSizeMax ? String(tour.groupSizeMax) : '',
            },
            { label: t('startTimes'), value: tour.startTimes.join(', ') },
          ]}
        />
      </DetailSection>

      {tour.overview ? (
        <DetailSection>
          <RichText data={tour.overview} className="max-w-3xl" />
        </DetailSection>
      ) : null}

      {tour.highlights.length ? (
        <DetailSection title={t('highlights')}>
          <CheckList items={tour.highlights} />
        </DetailSection>
      ) : null}

      {tour.included.length || tour.notIncluded.length ? (
        <DetailSection title={t('included')}>
          <CheckList items={tour.included} />
          {tour.notIncluded.length ? (
            <div className="mt-8">
              <h3 className="mb-4 font-body-lg text-body-lg text-primary">{t('notIncluded')}</h3>
              <CheckList items={tour.notIncluded} muted />
            </div>
          ) : null}
        </DetailSection>
      ) : null}

      <Container className="py-14">
        <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-hairline bg-surface-container-low p-8 md:flex-row md:items-center">
          {tour.pricePerPerson !== null ? (
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t('from')}{' '}
              <Price
                amount={tour.pricePerPerson}
                currencies={settings.currencies}
                className="font-headline-section text-headline-section text-primary"
              />
            </p>
          ) : (
            <p className="font-body-lg text-body-lg text-primary">{t('priceOnRequest')}</p>
          )}
          <ButtonLink href={`/booking/tour?item=${tour.slug}`} variant="navy" size="lg">
            {t('bookNow')}
          </ButtonLink>
        </div>
      </Container>
    </>
  )
}

export default DailyTourDetailPage
