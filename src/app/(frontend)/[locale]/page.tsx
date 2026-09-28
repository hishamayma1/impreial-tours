import type { Metadata } from 'next'
import { Suspense } from 'react'
import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import {
  HeroSection,
  ServicesSection,
  TopToursSection,
  OffersSection,
  DestinationsSection,
  TestimonialsSection,
  PlanJourneySection,
} from '@/components/home/sections'
import {
  HeroSkeleton,
  OffersSkeleton,
  TopToursSkeleton,
  PlanJourneySkeleton,
  SectionSkeleton,
  ServicesSkeleton,
  TestimonialsSkeleton,
} from '@/components/home/section-skeletons'
import { routing, type Locale } from '@/i18n/routing'
import { getHomePage, getSiteSettings } from '@/lib/payload/queries'
import { firstFilled } from '@/lib/utils'
import { buildAlternates } from '@/lib/seo'

type PageProps = { params: Promise<{ locale: string }> }

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { locale } = await params

  /**
   * Next runs this in parallel with the layout, so the layout's notFound() cannot
   * stop it. Without this guard a request for a non-route like /favicon.ico reaches
   * the CMS as locale "favicon.ico" and logs a read failure per query.
   */
  if (!hasLocale(routing.locales, locale)) return {}

  const [home, t, settings] = await Promise.all([
    getHomePage(locale),
    getTranslations({ locale, namespace: 'meta' }),
    getSiteSettings(locale),
  ])

  /**
   * The translated tagline is the last resort deliberately: `firstFilled` returning ''
   * would override the layout's title template with an empty string, and the page
   * would render with no <title> element at all — costing both SEO and screen-reader
   * users their only page label.
   */
  const title = firstFilled(home.seo.title, home.hero.title, t('tagline'))
  const description = firstFilled(home.seo.description, home.hero.subtitle, t('defaultDescription'))

  /**
   * A page's `openGraph` replaces the layout's wholesale rather than merging with it,
   * so leaving `images` undefined here did not inherit the site-wide share image — it
   * shipped the root, the most-shared URL on the site, with no `og:image` at all.
   * Falls back to the hero photograph, which makes a better card than the logo the
   * layout would have used; `type` is restated for the same replace-not-merge reason.
   * The layout's own choice stays the last resort, so an empty hero cannot blank it.
   */
  const imageUrl =
    home.seo.image?.url ??
    home.hero.image?.url ??
    settings.defaultSeo.image?.url ??
    settings.logo?.url
  const images = imageUrl ? [imageUrl] : undefined

  return {
    title,
    description,
    alternates: buildAlternates(locale as Locale),
    openGraph: {
      type: 'website',
      title,
      description,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
  }
}

const HomePage = async ({ params }: PageProps) => {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  setRequestLocale(locale)

  /**
   * Each section streams independently, so the hero paints as soon as its own query
   * resolves rather than waiting on the five sections below it. The skeletons hold
   * each band's height, so filling them in shifts nothing.
   */
  return (
    <>
      {/*
        Marks the region the header may render transparently over. HeaderShell looks
        for this element on every route: finding it puts the bar in its overlay state
        until the hero's foot passes underneath, and finding none — every inner page —
        keeps it solid white from the first paint.

        It wraps the Suspense boundary rather than sitting inside it so the element
        survives the swap from skeleton to hero; a marker inside would be torn out of
        the DOM at exactly the moment the observer needs it.
      */}
      <div data-hero-zone>
        <Suspense fallback={<HeroSkeleton />}>
          <HeroSection locale={locale as Locale} />
        </Suspense>
      </div>

      <Suspense fallback={<ServicesSkeleton />}>
        <ServicesSection locale={locale as Locale} />
      </Suspense>


      <Suspense fallback={<TopToursSkeleton />}>
        <TopToursSection locale={locale as Locale} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton columns={3} />}>
        <DestinationsSection locale={locale as Locale} />
      </Suspense>

      
      <Suspense fallback={<PlanJourneySkeleton />}>
        <PlanJourneySection locale={locale as Locale} />
      </Suspense>

      <Suspense fallback={<OffersSkeleton />}>
        <OffersSection locale={locale as Locale} />
      </Suspense>

      <Suspense fallback={<TestimonialsSkeleton />}>
        <TestimonialsSection locale={locale as Locale} />
      </Suspense>

    </>
  )
}

export default HomePage
