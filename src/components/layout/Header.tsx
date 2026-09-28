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
import {
  NavHotelRecommendations,
  NavRecommendations,
  NavRecommendationsSkeleton,
  NavTransferRecommendations,
} from './NavRecommendations'
import { PrimaryNav } from './PrimaryNav'

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
        This row is the bar itself: a floating white pill at every width, a fixed 56px
        tall, that never shrinks or goes transparent. HeaderShell supplies the 12px
        frame around it — together the 80px that the heroes cancel with `-mt-20`, so a
        hero photograph still runs to the very top of the viewport behind the pill.
      */}
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-2 rounded-full bg-white pl-2 pr-3 shadow-nav ring-1 ring-outline-variant/40 md:pr-2">
        <Link
          href="/"
          className="group/logo flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2"
        >
          <span className="relative block h-10 w-10 overflow-hidden rounded-full ring-1 ring-outline-variant/50 transition-transform duration-300 group-hover/logo:scale-105">
            <CmsImage
              image={settings.logo}
              alt={settings.brandName}
              sizes="48px"
              className="object-contain"
            />
          </span>
          <span className="whitespace-nowrap font-display-hero text-base font-semibold tracking-wide text-primary min-[380px]:text-lg md:text-xl lg:max-xl:sr-only">
            {settings.brandName}
          </span>
        </Link>

        {/*
          Each hub's recommendation rail is handed over as a server-rendered slot,
          behind its own Suspense boundary. The header sits above the fold on every
          route, so it must not block on a database read; every panel starts closed,
          so each rail has the whole of the first paint to arrive and is normally
          resolved long before anyone opens that hub's menu.
        */}
        <PrimaryNav
          items={navItems}
          featuredByHub={{
            '/tours': (
              <Suspense fallback={<NavRecommendationsSkeleton />}>
                <NavRecommendations locale={locale} currencies={settings.currencies} />
              </Suspense>
            ),
            '/hotels': (
              <Suspense fallback={<NavRecommendationsSkeleton />}>
                <NavHotelRecommendations locale={locale} currencies={settings.currencies} />
              </Suspense>
            ),
            '/transfers': (
              <Suspense fallback={<NavRecommendationsSkeleton />}>
                <NavTransferRecommendations locale={locale} currencies={settings.currencies} />
              </Suspense>
            ),
          }}
        />

        {/*
          The colour is set once here and both switchers inherit it through
          `currentColor`.
        */}
        <div className="flex shrink-0 items-center gap-2 text-on-surface-variant min-[380px]:gap-3 md:gap-5">
          <LocaleSwitcher className="hidden sm:flex" />
          <CurrencySwitcher currencies={settings.currencies} />
          <ButtonLink
            href={cta.href}
            variant="navy"
            // Fully rounded and a little shorter, to sit inside the pill's curve.
            className="hidden h-10 whitespace-nowrap rounded-full px-6 lg:inline-flex"
          >
            {cta.label}
          </ButtonLink>
          <MobileNav items={navItems} cta={cta} />
        </div>
      </div>
    </HeaderShell>
  )
}
