import type { MetadataRoute } from 'next'
import type { Where } from 'payload'

import { locales, defaultLocale, localeLabels } from '@/i18n/routing'
import { siteUrl, localizedPath } from '@/lib/seo'
import { getAllSlugs } from '@/lib/payload/services'

/**
 * Localized sitemap (spec Section 2.8).
 *
 * Every entry carries `alternates.languages` so search engines see all three
 * translations as one document rather than three competitors. Detail URLs use each
 * language's own slug, which is why the slug lists are fetched per locale rather than
 * translated from English.
 */

const STATIC_PATHS = [
  '',
  '/tours/daily',
  '/tours/experiences',
  '/hotels',
  '/transfers',
  '/transfers/airport',
  '/transfers/intercity',
  '/transfers/custom',
  '/bicycles',
  '/about',
  '/contact',
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
  const slugSets = await Promise.all(
    collections.flatMap(({ collection, base, where }) =>
      locales.map(async (locale) => ({
        base,
        locale,
        slugs: await getAllSlugs(collection, locale, where),
      })),
    ),
  )

  for (const { base, locale, slugs } of slugSets) {
    for (const slug of slugs) {
      entries.push({
        url: `${siteUrl}${localizedPath(locale, `${base}/${slug}`)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  }

  return entries
}

export default sitemap
