import type { MetadataRoute } from 'next'
import type { Where } from 'payload'

import { locales, defaultLocale, localeLabels } from '@/i18n/routing'
import { siteUrl, localizedPath } from '@/lib/seo'
import { getLocalizedSlugs } from '@/lib/payload/services'

/**
 * Localized sitemap (spec Section 2.8).
 *
 * Every entry carries `alternates.languages` so search engines see all three
 * translations as one document rather than three competitors. Detail URLs use each
 * language's own slug, which is why the slug lists are fetched per locale rather than
 * translated from English.
 */

/**
 * `/about` and `/contact` are listed again: both now carry real content and have had
 * their `robots: { index: false }` removed, which is exactly the condition the note
 * that used to sit here asked for. A sitemap must never advertise a noindexed URL —
 * it asks a crawler to fetch a page it has been told to discard — so if either ever
 * goes back to a placeholder, take it out of this list in the same change.
 */
const STATIC_PATHS = [
  '',
  '/about',
  '/contact',
  // The combined catalogue. Only the bare path: every filtered view of it is a
  // near-duplicate that already asks not to be indexed.
  '/tours',
  '/tours/daily',
  '/tours/experiences',
  '/hotels',
  '/transfers',
  '/transfers/airport',
  '/transfers/intercity',
  '/transfers/custom',
  '/bicycles',
]

const languagesFor = (paths: Partial<Record<string, string>>): Record<string, string> => {
  const languages: Record<string, string> = {}
  for (const locale of locales) {
    const path = paths[locale]
    if (path) languages[localeLabels[locale].hreflang] = `${siteUrl}${path}`
  }
  const fallback = paths[defaultLocale]
  if (fallback) languages['x-default'] = `${siteUrl}${fallback}`
  return languages
}

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const entries: MetadataRoute.Sitemap = []

  // Static pages share one path across languages.
  for (const path of STATIC_PATHS) {
    const byLocale = Object.fromEntries(
      locales.map((locale) => [locale, localizedPath(locale, path)]),
    )

    for (const locale of locales) {
      entries.push({
        url: `${siteUrl}${localizedPath(locale, path)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: path === '' ? 1 : 0.8,
        alternates: { languages: languagesFor(byLocale) },
      })
    }
  }

  // Detail pages: each locale contributes its own slugs. A slug list that comes back
  // empty (unreachable database at build time) simply contributes nothing, so the
  // sitemap still generates rather than failing the build.
  const collections: Array<{
    collection: 'tours' | 'hotels' | 'bicycles'
    base: string
    where: Where
  }> = [
    { collection: 'tours', base: '/tours/daily', where: { tourType: { equals: 'daily' } } },
    {
      collection: 'tours',
      base: '/tours/experiences',
      where: { tourType: { equals: 'experience' } },
    },
    { collection: 'hotels', base: '/hotels', where: {} },
    { collection: 'bicycles', base: '/bicycles', where: {} },
  ]

  // Fetched in parallel, not in sequence: twelve serial reads means twelve serial
  // timeouts if the database is unreachable, which is long enough for a crawler (or a
  // build) to give up on the request entirely.
  const documentSets = await Promise.all(
    collections.map(async ({ collection, base, where }) => ({
      base,
      documents: await getLocalizedSlugs(collection, where),
    })),
  )

  /**
   * Detail URLs carry `hreflang` too. Slugs are localized, so the three language
   * versions of one tour are three unrelated-looking URLs; without this they compete
   * with each other in the index instead of being understood as one document.
   */
  for (const { base, documents } of documentSets) {
    for (const slugByLocale of documents) {
      const byLocale = Object.fromEntries(
        locales
          .filter((locale) => slugByLocale[locale])
          .map((locale) => [locale, localizedPath(locale, `${base}/${slugByLocale[locale]}`)]),
      )
      const languages = languagesFor(byLocale)

      for (const locale of locales) {
        const path = byLocale[locale]
        if (!path) continue
        entries.push({
          url: `${siteUrl}${path}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: { languages },
        })
      }
    }
  }

  return entries
}

export default sitemap
