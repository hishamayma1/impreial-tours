import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { getFooter, getSiteSettings } from '@/lib/payload/queries'
import { firstFilled } from '@/lib/utils'

export const Footer = async ({ locale }: { locale: Locale }) => {
  const [footer, settings, t, nav] = await Promise.all([
    getFooter(locale),
    getSiteSettings(locale),
    getTranslations('footer'),
    getTranslations('nav'),
  ])

  /**
   * Fallback columns for a Footer global no editor has filled in yet.
   *
   * These previously listed Privacy Policy, Terms, Travel Insurance, Sitemap and an
   * Agent Portal — five links to routes that were never built, so every one 404'd on
   * every page of the site. A footer that sends people nowhere is worse than a
   * shorter one, so the placeholder now points at the routes that exist. Populate the
   * Footer global in the dashboard and this is replaced wholesale.
   */
  const columns =
    footer.columns.length > 0
      ? footer.columns
      : [
          {
            title: nav('tours'),
            links: [
              { label: nav('allTours'), href: '/tours' },
              { label: nav('dailyTours'), href: '/tours/daily' },
              { label: nav('fullExperiences'), href: '/tours/experiences' },
              { label: nav('hotels'), href: '/hotels' },
            ],
          },
          {
            title: nav('transfers'),
            links: [
              { label: nav('airportTransfer'), href: '/transfers/airport' },
              { label: nav('cityToCity'), href: '/transfers/intercity' },
              { label: nav('bicycles'), href: '/bicycles' },
            ],
          },
          {
            title: nav('about'),
            links: [
              { label: nav('about'), href: '/about' },
              { label: nav('contact'), href: '/contact' },
              { label: nav('privacyPolicy'), href: '/privacy-policy' },
            ],
          },
        ]

  return (
    <footer className="w-full bg-surface-container-low py-section-v-padding">
      <Container className="grid grid-cols-1 gap-grid-gutter md:grid-cols-4">
        <div className="col-span-1 md:col-span-2">
          <span className="mb-4 flex items-center gap-2 font-display-hero text-headline-card text-primary">
            <span className="relative block h-8 w-8 overflow-hidden rounded-full">
              <CmsImage
                image={settings.logo}
                alt={settings.brandName}
                sizes="32px"
                className="object-contain"
              />
            </span>
            {settings.brandName}
          </span>
          <p className="mb-6 max-w-sm font-body-md text-body-md text-on-surface">
            {firstFilled(footer.blurb, t('blurb'))}
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {t('rights', { year: new Date().getFullYear() })}
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title} className="col-span-1">
            <h2 className="mb-4 font-headline-card text-lg text-primary">{column.title}</h2>
            <ul className="space-y-3">
              {column.links.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="font-body-md text-body-md text-on-surface-variant transition-colors hover:text-brand"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
    </footer>
  )
}
