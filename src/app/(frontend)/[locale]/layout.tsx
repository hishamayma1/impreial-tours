import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale, getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { RoutePrefetcher } from '@/components/system/RoutePrefetcher'
import { JsonLd } from '@/components/seo/JsonLd'
import { organizationNode, websiteNode } from '@/lib/structured-data'
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

  /**
   * One share image for the whole site, inherited by every route that does not set
   * its own. Without it the root, the listings and both static pages shared to social
   * or pasted into a chat render as a bare link with no card.
   */
  const ogImage = settings.defaultSeo.image?.url ?? settings.logo?.url

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
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${siteName} — ${t('tagline')}`,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        // Without this, a travel result gets a thumbnail instead of the photography
        // the whole design is built around.
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
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

  const [t, messages, settings] = await Promise.all([
    getTranslations('nav'),
    getMessages(),
    getSiteSettings(locale as Locale),
  ])

  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        {/*
          Only the namespaces used by client components are serialised into the page;
          server components read the full catalogue directly. See i18n/client-namespaces.
        */}
        <NextIntlClientProvider messages={pickClientMessages(messages)}>
          <a href="#main" className="skip-link">
            {t('skipToContent')}
          </a>
          <Header locale={locale as Locale} />
          {/*
            `flex-1` is what makes the footer behave like a "fixed to the bottom"
            footer without actually being `position: fixed`: on a short page it grows
            to fill the leftover viewport height, pushing the footer down to sit flush
            with the bottom of the screen instead of leaving a gap beneath it. On a
            page long enough to scroll, this does nothing — the footer simply follows
            the content down, as it always did.
          */}
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer locale={locale as Locale} />
          {/* Warms the other service routes once this page is idle. Renders nothing. */}
          <RoutePrefetcher />
          {/*
            Site-wide schema.org graph, present on every page. Routes that describe a
            specific thing — a tour, a hotel, a listing — add their own node and refer
            back to this organization by @id rather than restating it.
          */}
          <JsonLd
            data={[
              organizationNode(settings, locale as Locale),
              websiteNode(settings, locale as Locale),
            ]}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

export default LocaleLayout
