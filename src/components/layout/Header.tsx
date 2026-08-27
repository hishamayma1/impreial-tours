import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { ButtonLink } from '@/components/ui/Button'
import { CmsImage } from '@/components/ui/CmsImage'
import { getHeader, getSiteSettings } from '@/lib/payload/queries'
import { buildDefaultNav, buildDefaultCta } from '@/lib/nav-defaults'
import type { NavItemVM } from '@/types/content'

import { CurrencySwitcher } from './CurrencySwitcher'
import { HeaderShell } from './HeaderShell'
import { LocaleSwitcher } from './LocaleSwitcher'
import { MobileNav } from './MobileNav'

/**
 * Nav links read their colour from the shell's `data-state`, not from a prop.
 *
 * Over the hero the bar is transparent, so the links have to be white; once the bar
 * turns solid they have to be navy on white. HeaderShell is the only client component
 * in the header, and passing its state down as props would drag the whole nav — CMS
 * copy included — into the client bundle. Publishing that state as a data attribute
 * on the `group/header` element instead lets these stay server-rendered strings.
 */
const linkBase =
  'relative font-body-md text-body-md tracking-wider transition-colors duration-300 ' +
  'text-white/85 hover:text-white ' +
  'group-data-[state=solid]/header:text-on-surface-variant group-data-[state=solid]/header:hover:text-brand'

/**
 * The hover rule is a scaled pseudo-element rather than `text-decoration`, so it
 * animates on the compositor and never reflows the line it sits under.
 */
const linkUnderline =
  'after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 ' +
  'after:bg-current after:transition-transform after:duration-300 ' +
  'hover:after:origin-left hover:after:scale-x-100 focus-visible:after:scale-x-100'

const linkClass = linkBase + ' ' + linkUnderline

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
    <div className="group/item relative flex items-center">
      <Link href={item.href} className={linkBase + ' inline-flex items-center gap-1'}>
        {item.label}
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="h-3 w-3 transition-transform duration-300 group-hover/item:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m5 7 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 translate-y-1 pt-5 opacity-0 transition-all duration-200 group-hover/item:visible group-hover/item:translate-y-0 group-hover/item:opacity-100 group-focus-within/item:visible group-focus-within/item:translate-y-0 group-focus-within/item:opacity-100">
        <ul className="min-w-[15rem] rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-2 shadow-widget">
          {item.children.map((child) => (
            <li key={`${child.href}-${child.label}`}>
              <Link
                href={child.href}
                className="group/child flex items-center justify-between gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 font-body-md text-body-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-brand"
              >
                {child.label}
                <span
                  aria-hidden
                  className="text-outline opacity-0 transition-opacity group-hover/child:opacity-100"
                >
                  &rarr;
                </span>
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
 * time, and only the shell and the three interactive controls ship JavaScript.
 */
export const Header = async ({ locale }: { locale: Locale }) => {
  const [header, settings, t] = await Promise.all([
    getHeader(locale),
    getSiteSettings(locale),
    getTranslations('nav'),
  ])

  // TODO(phase 6): prefer the `Navigation` global over the legacy `Header` global.
  const navItems =
    header.navItems.length > 0 ? header.navItems : buildDefaultNav(t, settings.enabledServices)
  const cta = header.cta ?? buildDefaultCta(t)

  return (
    <HeaderShell>
      {/*
        Height is fixed at 80px in the overlay state and only shrinks once the bar has
        gone solid. Hero cancels exactly that 80px with `-mt-20` so the photograph runs
        edge to edge from the top of the viewport; a bar that were shorter at first
        paint would leave a strip of page background above it.
      */}
      <div className="mx-auto flex h-20 w-full max-w-[1600px] items-center justify-between px-6 transition-[height] duration-300 group-data-[state=solid]/header:h-16 md:px-grid-margin">
        <Link
          href="/"
          className="group/logo flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2"
        >
          <span className="relative block h-10 w-10 overflow-hidden rounded-full ring-1 ring-white/30 transition-transform duration-300 group-hover/logo:scale-105 group-data-[state=solid]/header:ring-outline-variant/50 md:h-11 md:w-11">
            <CmsImage
              image={settings.logo}
              alt={settings.brandName}
              sizes="48px"
              className="object-contain"
            />
          </span>
          <span className="font-display-hero text-lg font-semibold tracking-wide text-white transition-colors duration-300 group-data-[state=solid]/header:text-primary md:text-xl">
            {settings.brandName}
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden gap-8 lg:flex">
          {navItems.map((item) => (
            <NavItem key={`${item.href}-${item.label}`} item={item} />
          ))}
        </nav>

        {/*
          The colour is set once here and both switchers inherit it through
          `currentColor`, so neither has to know which state the bar is in.
        */}
        <div className="flex items-center gap-3 text-white transition-colors duration-300 group-data-[state=solid]/header:text-on-surface-variant md:gap-5">
          <LocaleSwitcher className="hidden sm:flex" />
          <CurrencySwitcher currencies={settings.currencies} />
          <ButtonLink
            href={cta.href}
            variant="navy"
            className={
              'hidden lg:inline-flex ' +
              // Over the photograph a navy pill sinks into the scrim, so the overlay
              // state uses a glass chip that reads against whatever the editor uploads.
              'group-data-[state=overlay]/header:border group-data-[state=overlay]/header:border-white/50 ' +
              'group-data-[state=overlay]/header:bg-white/10 group-data-[state=overlay]/header:text-white ' +
              'group-data-[state=overlay]/header:backdrop-blur-sm ' +
              'group-data-[state=overlay]/header:hover:bg-white group-data-[state=overlay]/header:hover:text-brand'
            }
          >
            {cta.label}
          </ButtonLink>
          <MobileNav items={navItems} cta={cta} />
        </div>
      </div>
    </HeaderShell>
  )
}
