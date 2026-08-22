import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { ButtonLink } from '@/components/ui/Button'
import { CmsImage } from '@/components/ui/CmsImage'
import { getHeader, getSiteSettings } from '@/lib/payload/queries'
import type { NavItemVM } from '@/types/content'

import { CurrencySwitcher } from './CurrencySwitcher'
import { LocaleSwitcher } from './LocaleSwitcher'
import { MobileNav } from './MobileNav'

/**
 * Server component: nav items and branding are read from the CMS at build/revalidate
 * time, and only the three interactive controls ship JavaScript.
 */
export const Header = async ({ locale }: { locale: Locale }) => {
  const [header, settings, t] = await Promise.all([
    getHeader(locale),
    getSiteSettings(locale),
    getTranslations('nav'),
  ])

  const fallbackNav: NavItemVM[] = [
    { label: t('destinations'), href: '/destinations' },
    { label: t('tours'), href: '/tours' },
    { label: t('about'), href: '/about' },
    { label: t('contact'), href: '/contact' },
  ]

  const navItems = header.navItems.length > 0 ? header.navItems : fallbackNav
  const cta = header.cta ?? { label: t('bookNow'), href: '/booking' }

  return (
    <header className="sticky top-0 z-50 h-20 w-full bg-transparent">
      <div className="mx-auto mt-4 flex h-16 w-[calc(100%-32px)] max-w-6xl items-center justify-between rounded-full border border-white/20 bg-white/70 px-5 shadow-nav backdrop-blur-md transition-all duration-300 md:w-[calc(100%-48px)] md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="relative block h-10 w-10 overflow-hidden rounded-full md:h-12 md:w-12">
            <CmsImage
              image={settings.logo}
              alt={settings.brandName}
              sizes="48px"
              className="object-contain"
            />
          </span>
          <span className="font-display-hero text-lg font-semibold tracking-wide text-primary transition-opacity hover:opacity-80 md:text-xl">
            {settings.brandName}
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className="font-body-md text-body-md tracking-wider text-on-surface-variant transition-colors duration-300 hover:text-brand"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 md:gap-6">
          <LocaleSwitcher className="hidden sm:flex" />
          <CurrencySwitcher currencies={settings.currencies} />
          <ButtonLink href={cta.href} variant="navy" className="hidden md:inline-flex">
            {cta.label}
          </ButtonLink>
          <MobileNav items={navItems} cta={cta} />
        </div>
      </div>
    </header>
  )
}
