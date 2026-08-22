import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { getFooter, getSiteSettings } from '@/lib/payload/queries'
import { firstFilled } from '@/lib/utils'

export const Footer = async ({ locale }: { locale: Locale }) => {
  const [footer, settings, t] = await Promise.all([
    getFooter(locale),
    getSiteSettings(locale),
    getTranslations('footer'),
  ])

  const columns =
    footer.columns.length > 0
      ? footer.columns
      : [
          {
            title: t('legal'),
            links: [
              { label: 'Privacy Policy', href: '/legal/privacy' },
              { label: 'Terms of Service', href: '/legal/terms' },
            ],
          },
          {
            title: t('resources'),
            links: [
              { label: 'Travel Insurance', href: '/resources/insurance' },
              { label: 'Sitemap', href: '/sitemap' },
              { label: 'Agent Portal', href: '/agents' },
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
