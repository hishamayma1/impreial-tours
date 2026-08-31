import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { ButtonLink } from '@/components/ui/Button'
import { CmsImage } from '@/components/ui/CmsImage'
import { getHeader, getSiteSettings } from '@/lib/payload/queries'
import { buildDefaultNav, buildDefaultCta } from '@/lib/nav-defaults'

import { CurrencySwitcher } from './CurrencySwitcher'
import { HeaderShell } from './HeaderShell'
import { LocaleSwitcher } from './LocaleSwitcher'
import { MobileNav } from './MobileNav'
import { NavRecommendations, NavRecommendationsSkeleton } from './NavRecommendations'
import { PrimaryNav } from './PrimaryNav'

/** The hub whose mega panel carries the recommendation rail. */
const FEATURED_HUB = '/tours'

/**
 * Server component: nav items and branding are read from the CMS at build/revalidate
 * time, and only the shell and the interactive controls ship JavaScript.
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

        {/*
          The recommendation rail is handed over as a server-rendered slot, behind its
          own Suspense boundary. The header sits above the fold on every route, so it
          must not block on a database read; the panel starts closed, so the rail has
          the whole of the first paint to arrive and is normally resolved long before
          anyone opens the menu.
        */}
        <PrimaryNav
          items={navItems}
          featuredHref={FEATURED_HUB}
          featured={
            <Suspense fallback={<NavRecommendationsSkeleton />}>
              <NavRecommendations locale={locale} currencies={settings.currencies} />
            </Suspense>
          }
        />

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
