import { getTranslations } from 'next-intl/server'

import { Hero } from '@/components/sections/Hero'
import { Services } from '@/components/sections/Services'
import { Offers } from '@/components/sections/Offers'
import { FeaturedDestinations } from '@/components/sections/FeaturedDestinations'
import { Testimonials } from '@/components/sections/Testimonials'
import { Journal } from '@/components/sections/Journal'
import type { Locale } from '@/i18n/routing'
import {
  getFeaturedDestinations,
  getHomePage,
  getLatestPosts,
  getOffers,
  getServices,
  getTestimonials,
} from '@/lib/payload/queries'
import { firstFilled } from '@/lib/utils'
import type { SectionHeadingVM } from '@/types/content'

/**
 * The home page as six independently-streamed sections.
 *
 * Previously one component awaited all six queries in a single Promise.all, so the
 * hero — the LCP element — could not paint until the journal query came back. Each
 * section now fetches only what it renders and sits behind its own Suspense boundary,
 * so the hero arrives as soon as the hero query does and the rest fill in after.
 *
 * Every read is cache-tagged and request-deduplicated, so calling getHomePage from
 * several sections costs one query, not several.
 */

type Props = { locale: Locale }

/** CMS copy wins; the translated string is the fallback when an editor leaves it blank. */
const buildHeading = (
  t: Awaited<ReturnType<typeof getTranslations>>,
  section: SectionHeadingVM,
  keys: { eyebrow?: string; title: string; body?: string },
): SectionHeadingVM => ({
  eyebrow: firstFilled(section.eyebrow, keys.eyebrow ? t(keys.eyebrow) : ''),
  title: firstFilled(section.title, t(keys.title)),
  body: firstFilled(section.body, keys.body ? t(keys.body) : ''),
})

export const HeroSection = async ({ locale }: Props) => {
  const home = await getHomePage(locale)
  return <Hero hero={home.hero} />
}

export const ServicesSection = async ({ locale }: Props) => {
  const [home, services, t] = await Promise.all([
    getHomePage(locale),
    getServices(locale),
    getTranslations(),
  ])

  return (
    <Services
      heading={buildHeading(t, home.sections.services, {
        eyebrow: 'services.eyebrow',
        title: 'services.title',
      })}
      services={services}
    />
  )
}

export const OffersSection = async ({ locale }: Props) => {
  const [home, offers, t] = await Promise.all([
    getHomePage(locale),
    getOffers(locale),
    getTranslations(),
  ])

  return (
    <Offers
      heading={buildHeading(t, home.sections.offers, {
        eyebrow: 'offers.eyebrow',
        title: 'offers.title',
        body: 'offers.body',
      })}
      offers={offers}
    />
  )
}

export const DestinationsSection = async ({ locale }: Props) => {
  const [home, destinations, t] = await Promise.all([
    getHomePage(locale),
    getFeaturedDestinations(locale),
    getTranslations(),
  ])

  return (
    <FeaturedDestinations
      heading={buildHeading(t, home.sections.destinations, { title: 'destinations.title' })}
      destinations={destinations}
      exploreLabel={(name) => t('destinations.explore', { name })}
    />
  )
}

export const TestimonialsSection = async ({ locale }: Props) => {
  const [home, testimonials, t] = await Promise.all([
    getHomePage(locale),
    getTestimonials(locale),
    getTranslations(),
  ])

  return (
    <Testimonials
      heading={buildHeading(t, home.sections.testimonials, {
        eyebrow: 'testimonials.eyebrow',
        title: 'testimonials.title',
      })}
      testimonials={testimonials}
    />
  )
}

export const JournalSection = async ({ locale }: Props) => {
  const [home, posts, t] = await Promise.all([
    getHomePage(locale),
    getLatestPosts(locale),
    getTranslations(),
  ])

  return (
    <Journal
      heading={buildHeading(t, home.sections.journal, {
        eyebrow: 'journal.eyebrow',
        title: 'journal.title',
      })}
      posts={posts}
      readAllLabel={t('journal.readAll')}
    />
  )
}
