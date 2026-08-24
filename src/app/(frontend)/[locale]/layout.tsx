import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale, getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { RoutePrefetcher } from '@/components/system/RoutePrefetcher'
import { routing, locales, localeLabels, type Locale } from '@/i18n/routing'
import { pickClientMessages } from '@/i18n/client-namespaces'
import { getSiteSettings } from '@/lib/payload/queries'
import { buildAlternates, siteUrl } from '@/lib/seo'
import { firstFilled } from '@/lib/utils'

import '../globals.css'

/**
 * Subsets and weights are both cut to exactly what the site renders.
 *
 * `latin` alone is correct: every non-ASCII character in the Spanish and German copy
 * (ñ á é í ó ú ü ä ö ß ¿ – — …) lives in Latin-1 Supplement, which the `latin` subset
 * covers. `latin-ext` is Latin Extended-A — Polish, Czech, Turkish — and this site
 * ships none of it, so adding it downloaded a second set of files for glyphs nothing
 * uses. Add it back the day a locale needs those scripts.
 *
 * Weight 700 was never referenced by the type scale or any utility class.
 */
const display = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-display',
  display: 'swap',
})

const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

/** Pre-render all three languages at build time. */
export const generateStaticParams = () => locales.map((locale) => ({ locale }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> => {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}

  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'meta' }),
    getSiteSettings(locale as Locale),
  ])

  const siteName = firstFilled(settings.brandName, t('siteName'))
  const description = firstFilled(settings.defaultSeo.description, t('defaultDescription'))
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${siteName} — ${t('tagline')}`,
      template: `%s — ${siteName}`,
    },
    description,
    alternates: buildAlternates(locale as Locale),
    openGraph: {
      type: 'website',
      siteName,
      description,
      locale,
    },
  }
}

const LocaleLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) => {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  // Opts every page under this layout into static rendering.
  setRequestLocale(locale)

  const [t, messages] = await Promise.all([getTranslations('nav'), getMessages()])

  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body>
        {/*
          Only the namespaces used by client components are serialised into the page;
          server components read the full catalogue directly. See i18n/client-namespaces.
        */}
        <NextIntlClientProvider messages={pickClientMessages(messages)}>
          <a href="#main" className="skip-link">
            {t('skipToContent')}
          </a>
          <Header locale={locale as Locale} />
          <main id="main">{children}</main>
          <Footer locale={locale as Locale} />
          {/* Warms the other service routes once this page is idle. Renders nothing. */}
          <RoutePrefetcher />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

export default LocaleLayout
