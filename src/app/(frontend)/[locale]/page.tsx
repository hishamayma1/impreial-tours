import type { Metadata } from 'next'
import { Suspense } from 'react'
import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import {
  HeroSection,
  ServicesSection,
  OffersSection,
  DestinationsSection,
  TestimonialsSection,
  JournalSection,
} from '@/components/home/sections'
import {
  HeroSkeleton,
  OffersSkeleton,
  SectionSkeleton,
  TestimonialsSkeleton,
} from '@/components/home/section-skeletons'
import { routing, type Locale } from '@/i18n/routing'
import { getHomePage } from '@/lib/payload/queries'
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

  const [home, t] = await Promise.all([
    getHomePage(locale),
    getTranslations({ locale, namespace: 'meta' }),
  ])

  /**
   * The translated tagline is the last resort deliberately: `firstFilled` returning ''
   * would override the layout's title template with an empty string, and the page
   * would render with no <title> element at all — costing both SEO and screen-reader
   * users their only page label.
   */
  const title = firstFilled(home.seo.title, home.hero.title, t('tagline'))
  const description = firstFilled(home.seo.description, home.hero.subtitle, t('defaultDescription'))

  return {
    title,
    description,
    alternates: buildAlternates(locale as Locale),
    openGraph: {
      title,
      description,
      images: home.seo.image ? [{ url: home.seo.image.url }] : undefined,
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
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection locale={locale as Locale} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton columns={2} />}>
        <ServicesSection locale={locale as Locale} />
      </Suspense>

      <Suspense fallback={<OffersSkeleton />}>
        <OffersSection locale={locale as Locale} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton columns={3} />}>
        <DestinationsSection locale={locale as Locale} />
      </Suspense>

      <Suspense fallback={<TestimonialsSkeleton />}>
        <TestimonialsSection locale={locale as Locale} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton columns={3} />}>
        <JournalSection locale={locale as Locale} />
      </Suspense>
    </>
  )
}

export default HomePage
