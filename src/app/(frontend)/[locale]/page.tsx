import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

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
import { buildAlternates } from '@/lib/seo'
import type { SectionHeadingVM } from '@/types/content'

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
   * Every read is cache-tagged, so these six calls collapse to zero database work
   * between CMS edits. Fetching them in parallel keeps the cold path fast too.
   */
  const [home, services, offers, destinations, testimonials, posts, t] = await Promise.all([
    getHomePage(locale),
    getServices(locale),
    getOffers(locale),
    getFeaturedDestinations(locale),
    getTestimonials(locale),
    getLatestPosts(locale),
    getTranslations(),
  ])

  /** CMS copy wins; the translated string is the fallback when an editor leaves it blank. */
  const heading = (
    section: SectionHeadingVM,
    keys: { eyebrow?: string; title: string; body?: string },
  ): SectionHeadingVM => ({
    eyebrow: firstFilled(section.eyebrow, keys.eyebrow ? t(keys.eyebrow) : ''),
    title: firstFilled(section.title, t(keys.title)),
    body: firstFilled(section.body, keys.body ? t(keys.body) : ''),
  })

  return (
    <>
      <Hero hero={home.hero} />

      <Services
        heading={heading(home.sections.services, {
          eyebrow: 'services.eyebrow',
          title: 'services.title',
        })}
        services={services}
      />

      <Offers
        heading={heading(home.sections.offers, {
          eyebrow: 'offers.eyebrow',
          title: 'offers.title',
          body: 'offers.body',
        })}
        offers={offers}
      />

      <FeaturedDestinations
        heading={heading(home.sections.destinations, { title: 'destinations.title' })}
        destinations={destinations}
        exploreLabel={(name) => t('destinations.explore', { name })}
      />

      <Testimonials
        heading={heading(home.sections.testimonials, { eyebrow: 'testimonials.eyebrow', title: 'testimonials.eyebrow' })}
        testimonials={testimonials}
      />

      <Journal
        heading={heading(home.sections.journal, {
          eyebrow: 'journal.eyebrow',
          title: 'journal.title',
        })}
        posts={posts}
        readAllLabel={t('journal.readAll')}
      />
    </>
  )
}

export default HomePage
