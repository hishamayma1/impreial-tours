import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { TourHero } from '@/components/tour/TourHero'
import { SectionNav } from '@/components/tour/SectionNav'
import { BookingPanel } from '@/components/tour/BookingPanel'
import { TourSection } from '@/components/tour/TourSection'
import { HighlightList, InclusionColumns } from '@/components/tour/TourContentBlocks'
import { TourGallery } from '@/components/tour/TourGallery'
import { RichText } from '@/components/ui/RichText'
import { CancellationPolicy } from '@/components/shared/CancellationPolicy'
import { Container } from '@/components/ui/Container'
import { locales, type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'
import { getSiteSettings } from '@/lib/payload/queries'
import { getTourBySlug, getAllSlugs, getAlternateSlugs } from '@/lib/payload/services'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbNode, tourNode } from '@/lib/structured-data'

const PATH = '/tours/daily'
type PageParams = { locale: string; slug: string }

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

  const [tour, settings, t] = await Promise.all([
    getTourBySlug(locale as Locale, slug, 'daily'),
    getSiteSettings(locale as Locale),
    getTranslations('services'),
  ])

  if (!tour) notFound()

  const difficulty = tour.difficulty ? t(`difficulty.${tour.difficulty}`) : ''

  /** Facts shared by the hero rail and the booking panel, so the two never disagree. */
  const facts = [
    tour.durationHours
      ? { icon: 'clock' as const, label: t('duration'), value: t('fact.hours', { count: String(tour.durationHours) }) }
      : null,
    difficulty ? { icon: 'signal' as const, label: t('difficultyLabel'), value: difficulty } : null,
    tour.groupSizeMax
      ? { icon: 'users' as const, label: t('groupSize'), value: String(tour.groupSizeMax) }
      : null,
    tour.languages.length
      ? { icon: 'globe' as const, label: t('fact.languagesLabel'), value: tour.languages.map((code) => code.toUpperCase()).join(' · ') }
      : null,
  ].filter((fact): fact is NonNullable<typeof fact> => Boolean(fact))

  // Only sections that actually have content get an anchor — a nav pointing at an
  // empty section is worse than a shorter nav.
  // The gallery leads, ahead of the overview: a reader deciding on a day out looks at
  // the place before reading about it, and the nav order has to match the page order
  // or the anchors run backwards.
  const sections = [
    tour.gallery.length ? { id: 'gallery', label: t('gallery') } : null,
    tour.overview ? { id: 'overview', label: t('overview') } : null,
    tour.highlights.length ? { id: 'highlights', label: t('highlights') } : null,
    tour.included.length || tour.notIncluded.length ? { id: 'included', label: t('included') } : null,
    tour.meetingPoint ? { id: 'meeting-point', label: t('meetingPoint') } : null,
    // Always present — every tour has a cancellation policy, whether it is this
    // document's own override or the standard one CancellationPolicy falls back to.
    { id: 'cancellation-policy', label: t('cancellationPolicy') },
  ].filter((section): section is NonNullable<typeof section> => Boolean(section))

  const panel = (
    <BookingPanel
      price={tour.pricePerPerson}
      priceNote={t('perPersonShort')}
      secondaryPrice={
        tour.childPrice ? { label: t('childPriceLabel'), amount: tour.childPrice } : null
      }
      facts={facts}
      href={`/booking/tour?item=${tour.slug}`}
      currencies={settings.currencies}
      instantConfirmation={tour.instantConfirmation}
      departures={tour.startTimes}
    />
  )

  return (
    <>
      <TourHero
        title={tour.title}
        summary={tour.shortDescription}
        image={tour.heroImage}
        badge={tour.badge}
        rating={tour.rating}
        facts={facts.slice(0, 4)}
        breadcrumb={{ label: t('allTours'), href: PATH }}
      />

      <SectionNav items={sections} label={t('onThisPage')} />

      <Container className="py-10 md:py-14">
        {/*
          Two columns on desktop: content leads, the price card tracks alongside.
          On mobile the panel comes first — the price is the question a reader has
          before deciding whether to read on — and the grid order swaps it back on
          large screens.
        */}
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:order-2 lg:col-span-4">{panel}</div>

          <div className="lg:order-1 lg:col-span-8">
            {/*
              The gallery opens the column. It carries no top border and no heading
              rule above it because it is the first thing under the hero — the
              photographs continue the hero rather than starting a new section.
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

            {tour.meetingPoint ? (
              <TourSection id="meeting-point" title={t('meetingPoint')} className="border-t border-hairline">
                <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
                  {tour.meetingPoint}
                </p>
              </TourSection>
            ) : null}

            <TourSection
              id="cancellation-policy"
              title={t('cancellationPolicy')}
              className="border-t border-hairline"
            >
              <div className="max-w-2xl">
                <CancellationPolicy override={tour.cancellationPolicy} />
              </div>
            </TourSection>
          </div>
        </div>
      </Container>
    </>
  )
}

export default DailyTourDetailPage
