import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { DetailHero } from '@/components/services/DetailHero'
import { DetailSection, CheckList, FactRow } from '@/components/services/DetailSection'
import { RichText } from '@/components/ui/RichText'
import { ButtonLink } from '@/components/ui/Button'
import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { Price } from '@/components/ui/Price'
import { locales, type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'
import { getSiteSettings } from '@/lib/payload/queries'
import { getTourBySlug, getAllSlugs, getAlternateSlugs } from '@/lib/payload/services'

const PATH = '/tours/experiences'
type PageParams = { locale: string; slug: string }

export const generateStaticParams = async () => {
  const params: PageParams[] = []
  for (const locale of locales) {
    const slugs = await getAllSlugs('tours', locale, { tourType: { equals: 'experience' } })
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
  const tour = await getTourBySlug(locale as Locale, slug, 'experience')
  if (!tour) return {}

  const alternates = await getAlternateSlugs('tours', locale as Locale, slug)

  return {
    title: tour.title,
    description: tour.shortDescription,
    alternates: buildAlternates(locale as Locale, PATH, alternates),
    openGraph: { images: tour.heroImage ? [tour.heroImage.url] : [] },
  }
}

const ExperienceDetailPage = async ({ params }: { params: Promise<PageParams> }) => {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const [tour, settings, t, eyebrow] = await Promise.all([
    getTourBySlug(locale as Locale, slug, 'experience'),
    getSiteSettings(locale as Locale),
    getTranslations('services'),
    getTranslations('tours'),
  ])

  if (!tour) notFound()

  return (
    <>
      <DetailHero
        eyebrow={eyebrow('experiences.title')}
        title={tour.title}
        summary={tour.shortDescription}
        image={tour.heroImage}
      />

      <DetailSection>
        <FactRow
          facts={[
            { label: t('days'), value: tour.durationDays ? String(tour.durationDays) : '' },
            { label: t('nights'), value: tour.nights !== null ? String(tour.nights) : '' },
            {
              label: t('difficultyLabel'),
              value: tour.difficulty ? t(`difficulty.${tour.difficulty}`) : '',
            },
            {
              label: t('groupSize'),
              value: tour.groupSizeMax ? String(tour.groupSizeMax) : '',
            },
          ]}
        />
      </DetailSection>

      {tour.overview ? (
        <DetailSection>
          <RichText data={tour.overview} className="max-w-3xl" />
        </DetailSection>
      ) : null}

      {tour.itinerary.length ? (
        <DetailSection title={t('itinerary')}>
          <ol className="space-y-8">
            {tour.itinerary.map((day) => (
              <li
                key={day.dayNumber}
                className="grid gap-6 border-l-2 border-hairline pl-6 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="mb-1 font-label-caps text-label-caps uppercase tracking-widest text-brand">
                    {t('day')} {day.dayNumber}
                  </p>
                  <h3 className="mb-2 font-headline-card text-headline-card text-primary">
                    {day.dayTitle}
                  </h3>
                  <p className="max-w-2xl font-body-md text-body-md text-on-surface-variant">
                    {day.dayDescription}
                  </p>
                  {day.accommodation ? (
                    <p className="mt-2 font-body-md text-caption text-on-surface-variant">
                      {day.accommodation}
                    </p>
                  ) : null}
                </div>
                {day.image ? (
                  <div className="relative h-32 w-full overflow-hidden rounded-xl md:w-48">
                    <CmsImage
                      image={day.image}
                      alt={day.dayTitle}
                      sizes="192px"
                      className="object-cover"
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
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
          {tour.basePricePerPerson !== null ? (
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t('from')}{' '}
              <Price
                amount={tour.basePricePerPerson}
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

export default ExperienceDetailPage
