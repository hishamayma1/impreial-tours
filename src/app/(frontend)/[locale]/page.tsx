import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import {
  HeroSection,
  ServicesSection,
  OffersSection,
  DestinationsSection,
  TestimonialsSection,
  JournalSection,
} from '@/components/home/sections'
import { HeroSkeleton, SectionSkeleton } from '@/components/home/section-skeletons'
import type { Locale } from '@/i18n/routing'
import { getHomePage } from '@/lib/payload/queries'
import { firstFilled } from '@/lib/utils'
import { buildAlternates } from '@/lib/seo'

type PageProps = { params: Promise<{ locale: Locale }> }

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { locale } = await params
  const [home, t] = await Promise.all([getHomePage(locale), getTranslations({ locale, namespace: 'meta' })])

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
    alternates: buildAlternates(locale),
    openGraph: {
      title,
      description,
      images: home.seo.image ? [{ url: home.seo.image.url }] : undefined,
    },
  }
}

const HomePage = async ({ params }: PageProps) => {
  const { locale } = await params
  setRequestLocale(locale)

  /**
   * Each section streams independently, so the hero paints as soon as its own query
   * resolves rather than waiting on the five sections below it. The skeletons hold
   * each band's height, so filling them in shifts nothing.
   */
  return (
    <>
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection locale={locale} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton columns={3} />}>
        <ServicesSection locale={locale} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton columns={2} />}>
        <OffersSection locale={locale} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton columns={3} />}>
        <DestinationsSection locale={locale} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton columns={3} />}>
        <TestimonialsSection locale={locale} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton columns={3} />}>
        <JournalSection locale={locale} />
      </Suspense>
    </>
  )
}

export default HomePage
