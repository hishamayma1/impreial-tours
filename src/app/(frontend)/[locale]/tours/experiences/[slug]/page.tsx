import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { TourHero } from '@/components/tour/TourHero'
import { SectionNav } from '@/components/tour/SectionNav'
import { BookingPanel } from '@/components/tour/BookingPanel'
import { TourSection } from '@/components/tour/TourSection'
import {
  HighlightList,
  InclusionColumns,
  ItineraryTimeline,
  PriceTiers,
} from '@/components/tour/TourContentBlocks'
import { TourGallery } from '@/components/tour/TourGallery'
import { RichText } from '@/components/ui/RichText'
import { Container } from '@/components/ui/Container'
import { locales, type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'
import { getSiteSettings } from '@/lib/payload/queries'
import { getTourBySlug, getAllSlugs, getAlternateSlugs } from '@/lib/payload/services'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbNode, tourNode } from '@/lib/structured-data'

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

  const [tour, settings, t] = await Promise.all([
    getTourBySlug(locale as Locale, slug, 'experience'),
    getSiteSettings(locale as Locale),
    getTranslations('services'),
  ])

  if (!tour) notFound()

  const difficulty = tour.difficulty ? t(`difficulty.${tour.difficulty}`) : ''

  const facts = [
    tour.durationDays
      ? { icon: 'calendar' as const, label: t('fact.daysLabel'), value: String(tour.durationDays) }
      : null,
    tour.nights !== null
      ? { icon: 'moon' as const, label: t('fact.nightsLabel'), value: String(tour.nights) }
      : null,
    difficulty ? { icon: 'signal' as const, label: t('difficultyLabel'), value: difficulty } : null,
    tour.groupSizeMax
      ? { icon: 'users' as const, label: t('groupSize'), value: String(tour.groupSizeMax) }
      : null,
    tour.languages.length
      ? {
          icon: 'globe' as const,
          label: t('fact.languagesLabel'),
          value: tour.languages.map((code) => code.toUpperCase()).join(' · '),
        }
      : null,
  ].filter((fact): fact is NonNullable<typeof fact> => Boolean(fact))

  // The gallery leads, ahead of the overview: a reader deciding on a fortnight away
  // looks at where they are going before reading about it, and the nav order has to
  // match the page order or the anchors run backwards.
  const sections = [
    tour.gallery.length ? { id: 'gallery', label: t('gallery') } : null,
    tour.overview ? { id: 'overview', label: t('overview') } : null,
    tour.itinerary.length ? { id: 'itinerary', label: t('itinerary') } : null,
    tour.highlights.length ? { id: 'highlights', label: t('highlights') } : null,
    tour.included.length || tour.notIncluded.length ? { id: 'included', label: t('included') } : null,
    tour.priceTiers.length ? { id: 'pricing', label: t('groupPricing') } : null,
    tour.meetingPoint ? { id: 'meeting-point', label: t('meetingPoint') } : null,
  ].filter((section): section is NonNullable<typeof section> => Boolean(section))

  return (
    <>
      <TourHero
        title={tour.title}
        summary={tour.shortDescription}
        image={tour.heroImage}
        badge={tour.badge}
        rating={tour.rating}
        facts={facts}
        breadcrumb={{ label: t('allExperiences'), href: PATH }}
      />

      <SectionNav items={sections} label={t('onThisPage')} />

      <Container className="py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:order-2 lg:col-span-4">
            <BookingPanel
              price={tour.basePricePerPerson}
              priceNote={t('perPersonShort')}
              secondaryPrice={
                tour.singleSupplement
                  ? { label: t('singleSupplementLabel'), amount: tour.singleSupplement }
                  : null
              }
              facts={facts}
              href={`/booking/tour?item=${tour.slug}`}
              currencies={settings.currencies}
            />
          </div>

          <div className="lg:order-1 lg:col-span-8">
            {/*
              The gallery opens the column. It carries no top border because it is the
              first thing under the hero — the photographs continue the hero rather
              than starting a new section.
            */}
            {tour.gallery.length ? (
              <TourSection id="gallery" title={t('gallery')}>
                <TourGallery images={tour.gallery} title={tour.title} />
              </TourSection>
            ) : null}

            {tour.overview ? (
              <TourSection
                id="overview"
                title={t('overview')}
                className={tour.gallery.length ? 'border-t border-hairline' : undefined}
              >
                <RichText data={tour.overview} />
              </TourSection>
            ) : null}

            {/* The itinerary leads on a multi-day page: the sequence is the product. */}
            {tour.itinerary.length ? (
              <TourSection
                id="itinerary"
                title={t('itinerary')}
                eyebrow={
                  tour.durationDays && tour.nights !== null
                    ? `${tour.durationDays} ${t('fact.daysLabel')} · ${tour.nights} ${t('fact.nightsLabel')}`
                    : undefined
                }
                className="border-t border-hairline"
              >
                <ItineraryTimeline days={tour.itinerary} />
              </TourSection>
            ) : null}

            {tour.highlights.length ? (
              <TourSection id="highlights" title={t('highlights')} className="border-t border-hairline">
                <HighlightList items={tour.highlights} />
              </TourSection>
            ) : null}

            {tour.included.length || tour.notIncluded.length ? (
              <TourSection id="included" title={t('whatToExpect')} className="border-t border-hairline">
                <InclusionColumns included={tour.included} notIncluded={tour.notIncluded} />
              </TourSection>
            ) : null}

            {tour.priceTiers.length ? (
              <TourSection id="pricing" title={t('groupPricing')} className="border-t border-hairline">
                <PriceTiers tiers={tour.priceTiers} currencies={settings.currencies} />
              </TourSection>
            ) : null}

            {tour.meetingPoint ? (
              <TourSection
                id="meeting-point"
                title={t('meetingPoint')}
                className="border-t border-hairline"
              >
                <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
                  {tour.meetingPoint}
                </p>
              </TourSection>
            ) : null}
          </div>
        </div>
      </Container>
    </>
  )
}

export default ExperienceDetailPage
