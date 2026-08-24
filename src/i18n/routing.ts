import { defineRouting } from 'next-intl/routing'

/**
 * Single source of truth for locales. Payload's `localization.locales` in
 * src/payload.config.ts is derived from this array so the CMS and the front end
 * can never drift apart.
 */
export const locales = ['en', 'es', 'de'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeLabels: Record<Locale, { label: string; short: string; hreflang: string }> = {
  en: { label: 'English', short: 'EN', hreflang: 'en' },
  es: { label: 'Español', short: 'ES', hreflang: 'es' },
  de: { label: 'Deutsch', short: 'DE', hreflang: 'de' },
}

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Spec Section 2.3: the locale prefix is ALWAYS visible, so `/en/tours`,
  // `/es/tours`, `/de/tours`. `/` redirects to `/en` via the middleware.
  localePrefix: 'always',
})
