import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { routing, locales, localeLabels, type Locale } from '@/i18n/routing'
import { getSiteSettings } from '@/lib/payload/queries'
import { buildAlternates, siteUrl } from '@/lib/seo'
import { firstFilled } from '@/lib/utils'

import '../globals.css'

const display = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
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

  const t = await getTranslations('nav')

  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>
          <a href="#main" className="skip-link">
            {t('skipToContent')}
          </a>
          <Header locale={locale as Locale} />
          <main id="main">{children}</main>
          <Footer locale={locale as Locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

export default LocaleLayout
