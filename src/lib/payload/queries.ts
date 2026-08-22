import 'server-only'
import { unstable_cache } from 'next/cache'

import type { Locale } from '@/i18n/routing'
import type {
  DestinationVM,
  FooterVM,
  HeaderVM,
  HomePageVM,
  OfferVM,
  PostVM,
  ServiceVM,
  SiteSettingsVM,
  TestimonialVM,
} from '@/types/content'

import { getPayloadClient } from './client'
import {
  toDestination,
  toFooter,
  toHeader,
  toHomePage,
  toOffer,
  toPost,
  toService,
  toSiteSettings,
  toTestimonial,
} from './mappers'

/** One hour is a safety net only — Payload's afterChange hooks bust the tag on every edit. */
const REVALIDATE_SECONDS = 3600

/**
 * Wraps a locale-aware read in Next's data cache. The cache key includes the locale
 * so the three languages never bleed into one another, while the tag is shared so a
 * single CMS save refreshes all of them at once.
 *
 * A database outage degrades to `fallback` instead of taking the whole page down —
 * the front end is written so that empty collections simply hide their section, and
 * missing global copy falls back to the translated defaults. The failure is logged
 * loudly so it is never silent.
 */
const cachedByLocale =
  <T>(tag: string, fallback: T, loader: (locale: Locale) => Promise<T>) =>
  (locale: Locale): Promise<T> =>
    unstable_cache(
      async () => {
        try {
          return await loader(locale)
        } catch (error) {
          console.error(`[payload] "${tag}" read failed for locale "${locale}"`, error)
          return fallback
        }
      },
      [tag, locale],
      { tags: [tag], revalidate: REVALIDATE_SECONDS },
    )()

const emptyHeading = { eyebrow: '', title: '', body: '' }

const emptyHomePage: HomePageVM = {
  hero: { title: '', subtitle: '', image: null, defaultDestination: '' },
  sections: {
    services: emptyHeading,
    offers: emptyHeading,
    destinations: emptyHeading,
    testimonials: emptyHeading,
    journal: emptyHeading,
  },
  seo: { title: '', description: '', image: null },
}

export const getServices = cachedByLocale<ServiceVM[]>('services', [], async (locale) => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'services',
    locale,
    fallbackLocale: 'en',
    depth: 1,
    limit: 12,
    sort: 'order',
    where: { _status: { equals: 'published' } },
    overrideAccess: true,
  })
  return docs.map(toService)
})

export const getOffers = cachedByLocale<OfferVM[]>('offers', [], async (locale) => {
  const payload = await getPayloadClient()
  const now = new Date().toISOString()
  const { docs } = await payload.find({
    collection: 'offers',
    locale,
    fallbackLocale: 'en',
    depth: 1,
    limit: 10,
    sort: 'order',
    where: {
      and: [
        { _status: { equals: 'published' } },
        { or: [{ activeFrom: { exists: false } }, { activeFrom: { less_than_equal: now } }] },
        { or: [{ activeUntil: { exists: false } }, { activeUntil: { greater_than_equal: now } }] },
      ],
    },
    overrideAccess: true,
  })
  return docs.map(toOffer)
})

export const getFeaturedDestinations = cachedByLocale<DestinationVM[]>(
  'destinations',
  [],
  async (locale) => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'destinations',
      locale,
      fallbackLocale: 'en',
      depth: 1,
      limit: 6,
      sort: 'order',
      where: {
        and: [{ _status: { equals: 'published' } }, { featured: { equals: true } }],
      },
      overrideAccess: true,
    })
    return docs.map(toDestination)
  },
)

export const getTestimonials = cachedByLocale<TestimonialVM[]>('testimonials', [], async (locale) => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'testimonials',
    locale,
    fallbackLocale: 'en',
    depth: 1,
    limit: 8,
    sort: 'order',
    where: { _status: { equals: 'published' } },
    overrideAccess: true,
  })
  return docs.map(toTestimonial)
})

export const getLatestPosts = cachedByLocale<PostVM[]>('posts', [], async (locale) => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    locale,
    fallbackLocale: 'en',
    depth: 1,
    limit: 3,
    sort: '-publishedAt',
    where: { _status: { equals: 'published' } },
    overrideAccess: true,
  })
  return docs.map(toPost)
})

export const getHomePage = cachedByLocale<HomePageVM>('home-page', emptyHomePage, async (locale) => {
  const payload = await getPayloadClient()
  const doc = await payload.findGlobal({
    slug: 'home-page',
    locale,
    fallbackLocale: 'en',
    depth: 1,
    overrideAccess: true,
  })
  return toHomePage(doc as unknown as Record<string, unknown>)
})

export const getHeader = cachedByLocale<HeaderVM>('header', { navItems: [], cta: null }, async (locale) => {
  const payload = await getPayloadClient()
  const doc = await payload.findGlobal({
    slug: 'header',
    locale,
    fallbackLocale: 'en',
    depth: 0,
    overrideAccess: true,
  })
  return toHeader(doc as unknown as Record<string, unknown>)
})

export const getFooter = cachedByLocale<FooterVM>('footer', { blurb: '', columns: [] }, async (locale) => {
  const payload = await getPayloadClient()
  const doc = await payload.findGlobal({
    slug: 'footer',
    locale,
    fallbackLocale: 'en',
    depth: 0,
    overrideAccess: true,
  })
  return toFooter(doc as unknown as Record<string, unknown>)
})

export const getSiteSettings = cachedByLocale<SiteSettingsVM>(
  'site-settings',
  {
    brandName: 'IMPERIAL TOURS',
    logo: null,
    currencies: [],
    defaultSeo: { title: '', description: '', image: null },
  },
  async (locale) => {
  const payload = await getPayloadClient()
  const doc = await payload.findGlobal({
    slug: 'site-settings',
    locale,
    fallbackLocale: 'en',
    depth: 1,
    overrideAccess: true,
  })
  return toSiteSettings(doc as unknown as Record<string, unknown>)
})
