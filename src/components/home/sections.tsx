import { getTranslations } from 'next-intl/server'

import { Hero } from '@/components/sections/Hero'
import { Services } from '@/components/sections/Services'
import { Offers } from '@/components/sections/Offers'
import { TopTours } from '@/components/sections/TopTours'
import { FeaturedDestinations } from '@/components/sections/FeaturedDestinations'
import { Testimonials } from '@/components/sections/Testimonials'
import { PlanJourney } from '@/components/sections/PlanJourney'
import type { Locale } from '@/i18n/routing'
import {
  getFeaturedDestinations,
  getHomePage,
  getServices,
  getSiteSettings,
  getTestimonials,
} from '@/lib/payload/queries'
import { getSpotlightTours, getTourOffers } from '@/lib/payload/services'
import { firstFilled } from '@/lib/utils'
import type { SectionHeadingVM } from '@/types/content'

/**
 * The home page as six independently-streamed sections.
 *
 * Previously one component awaited every query in a single Promise.all, so the hero —
 * the LCP element — could not paint until the last query came back. Each section now
 * fetches only what it renders and sits behind its own Suspense boundary, so the hero
 * arrives as soon as the hero query does and the rest fill in after.
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

/**
 * The enquiry band's anchor, used as the secondary CTA everywhere on the page.
 *
 * A same-page hash rather than `/contact`: contact is still a placeholder route that
 * is deliberately kept out of the index, so pointing the page's softer CTA at it
 * would send every hesitant visitor to a "coming soon" note.
 */
const PLAN_ANCHOR = '#plan'

export const HeroSection = async ({ locale }: Props) => {
  const [home, t] = await Promise.all([getHomePage(locale), getTranslations('hero')])

  return (
    <Hero
      hero={home.hero}
      labels={{
        primaryCta: t('primaryCta'),
        secondaryCta: t('secondaryCta'),
        trust: [
          { icon: 'shield', label: t('trust.licensed') },
          { icon: 'clock', label: t('trust.reply') },
          { icon: 'star', label: t('trust.rated') },
        ],
      }}
    />
  )
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
      exploreLabel={t('services.explore')}
      cta={{
        primary: { label: t('cta.browseTours'), href: '/tours' },
        secondary: { label: t('cta.planWithUs'), href: PLAN_ANCHOR },
      }}
    />
  )
}

/**
 * The offers band reads from Tours, not the Offers collection.
 *
 * Every slide is a real tour flagged with `offer.active`, so "Discover" lands on that
 * tour's own detail page. Previously these were standalone Offer documents whose
 * `href` was free text pointing at `/offers/<slug>` — a route family that was never
 * built, so all three CTAs 404'd.
 */
export const OffersSection = async ({ locale }: Props) => {
  const [home, offers, t] = await Promise.all([
    getHomePage(locale),
    getTourOffers(locale),
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
      cta={{
        primary: { label: t('cta.seeAllOffers'), href: '/tours/experiences' },
        secondary: { label: t('cta.askAboutOffer'), href: PLAN_ANCHOR },
      }}
    />
  )
}

/**
 * "New & Top Tours" — the band between Services and Offers.
 *
 * Reads the tours themselves rather than a CMS-curated list: "newest" and "best
 * rated" are facts about the catalogue, so the band stays current on its own as
 * editors publish, without anyone remembering to re-pick six tours every month.
 *
 * Currencies come from site settings because the cards print prices, and the visitor
 * may have switched the currency in the header.
 */
export const TopToursSection = async ({ locale }: Props) => {
  const [home, groups, settings, t] = await Promise.all([
    getHomePage(locale),
    getSpotlightTours(locale),
    getSiteSettings(locale),
    getTranslations(),
  ])

  return (
    <TopTours
      /*
       * No CMS group behind this band yet, so the heading is translation-only. Adding
       * `sections.topTours` to the Home global later is the one change needed to let an
       * editor override it, exactly as every other band does.
       */
      heading={{
        eyebrow: t('topTours.eyebrow'),
        title: t('topTours.title'),
        body: t('topTours.body'),
      }}
      groups={groups}
      currencies={settings.currencies}
      labels={{
        tabNew: t('topTours.tabs.new'),
        tabTop: t('topTours.tabs.top'),
        tablist: t('topTours.tablist'),
      }}
      cta={{
        primary: { label: t('cta.browseTours'), href: '/tours' },
        secondary: { label: t('cta.planWithUs'), href: PLAN_ANCHOR },
      }}
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
      heading={buildHeading(t, home.sections.destinations, {
        title: 'destinations.title',
        // The section had no fallback body, so with the CMS group empty it rendered a
        // bare heading. CMS copy still wins when an editor fills it in.
        body: 'destinations.body',
      })}
      destinations={destinations}
      exploreLabel={(name) => t('destinations.explore', { name })}
      cta={{
        primary: { label: t('cta.allDestinations'), href: '/tours/daily' },
        secondary: { label: t('cta.planWithUs'), href: PLAN_ANCHOR },
      }}
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

/**
 * The enquiry band, in the slot the journal used to hold.
 *
 * The journal linked three cards at `/journal/<slug>`, a route family that was never
 * built, so the home page ended in three dead links. This ends it with the one thing
 * the page exists to produce instead.
 */
export const PlanJourneySection = async ({ locale }: Props) => {
  const [home, settings, t] = await Promise.all([
    getHomePage(locale),
    getSiteSettings(locale),
    getTranslations('plan'),
  ])

  return (
    <PlanJourney
      heading={buildHeading(t, home.sections.plan, {
        eyebrow: 'eyebrow',
        title: 'title',
        body: 'body',
      })}
      contact={settings.contact}
      labels={{
        benefits: [t('benefits.tailored'), t('benefits.local'), t('benefits.noFee')],
        stats: [
          { value: t('stats.yearsValue'), label: t('stats.yearsLabel') },
          { value: t('stats.travellersValue'), label: t('stats.travellersLabel') },
          { value: t('stats.ratingValue'), label: t('stats.ratingLabel') },
        ],
        orReachUs: t('orReachUs'),
        whatsapp: t('channels.whatsapp'),
        call: t('channels.call'),
        email: t('channels.email'),
      }}
    />
  )
}
