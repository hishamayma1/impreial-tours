import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { ButtonLink } from '@/components/ui/Button'
import { CmsImage } from '@/components/ui/CmsImage'
import { getHeader, getSiteSettings } from '@/lib/payload/queries'
import { buildDefaultNav, buildDefaultCta } from '@/lib/nav-defaults'
import type { NavItemVM } from '@/types/content'

import { CurrencySwitcher } from './CurrencySwitcher'
import { LocaleSwitcher } from './LocaleSwitcher'
import { MobileNav } from './MobileNav'

const linkClass =
  'font-body-md text-body-md tracking-wider text-on-surface-variant transition-colors duration-300 hover:text-brand'

/**
 * A top-level nav entry. Items with children open a submenu on hover and on keyboard
 * focus — done in pure CSS (`group-hover` + `group-focus-within`) so the Header stays
 * a Server Component and the dropdown costs no JavaScript. The trigger is itself a
 * real link to the hub, so the menu is never a keyboard trap.
 */
const NavItem = ({ item }: { item: NavItemVM }) => {
  if (!item.children?.length) {
    return (
      <Link href={item.href} className={linkClass}>
        {item.label}
      </Link>
    )
  }

  return (
    <div className="group relative flex items-center">
      <Link href={item.href} className={`${linkClass} inline-flex items-center gap-1`}>
        {item.label}
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="h-3 w-3 transition-transform duration-300 group-hover:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m5 7 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-5 opacity-0 transition-opacity duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <ul className="min-w-[15rem] rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-2 shadow-nav">
          {item.children.map((child) => (
            <li key={`${child.href}-${child.label}`}>
              <Link
                href={child.href}
                className="block whitespace-nowrap rounded-lg px-3 py-2.5 font-body-md text-body-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-brand"
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

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

  // TODO(phase 2): read from the `Navigation` global instead of `Header`, and drop
  // items whose service is switched off in SiteSettings.enabledServices.
  const navItems = header.navItems.length > 0 ? header.navItems : buildDefaultNav(t)
  const cta = header.cta ?? buildDefaultCta(t)

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
            <NavItem key={`${item.href}-${item.label}`} item={item} />
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
