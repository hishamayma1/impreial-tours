import { locales, localeLabels, defaultLocale, type Locale } from '@/i18n/routing'

/**
 * Absolute origin used for canonicals, hreflang and OG images.
 * NEXT_PUBLIC_SERVER_URL must be the public origin in production.
 */
export const siteUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

/**
 * With `localePrefix: 'always'` every route carries its locale, so a path is simply
 * `/{locale}{path}`. `path` is the locale-less pathname, e.g. '/tours/daily' or ''
 * for the home page.
 */
export const localizedPath = (locale: Locale, path = ''): string => {
  const clean = path === '/' ? '' : path
  return `/${locale}${clean}`
}

export type Alternates = {
  canonical: string
  languages: Record<string, string>
}

/**
 * Section 2.8: every page advertises all three languages plus x-default.
 *
 * `slugByLocale` lets detail pages point each hreflang at that language's own slug,
 * so switching language lands on the SAME document rather than a 404. Listing pages
 * omit it and share one path across locales.
 */
export const buildAlternates = (
  locale: Locale,
  path = '',
  slugByLocale?: Partial<Record<Locale, string>>,
): Alternates => {
  const pathFor = (code: Locale): string => {
    if (!slugByLocale) return localizedPath(code, path)
    const slug = slugByLocale[code]
    // No translation for this locale yet — fall back to the shared path so we never
    // emit an hreflang pointing at a URL that does not resolve.
    if (!slug) return localizedPath(code, path)
    return localizedPath(code, `${path}/${slug}`)
  }

  const languages: Record<string, string> = Object.fromEntries(
    locales.map((code) => [localeLabels[code].hreflang, pathFor(code)]),
  )
  languages['x-default'] = pathFor(defaultLocale)

  return { canonical: pathFor(locale), languages }
}
