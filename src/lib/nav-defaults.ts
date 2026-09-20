import type { NavItemVM } from '@/types/content'

type Translate = (key: string) => string

/**
 * Spec Section 5: the default main-nav structure.
 *
 * This is the fallback the Header renders until the `Navigation` global is populated
 * (that global arrives in Phase 2). Keeping it in one place means the shape the CMS
 * has to produce is documented by the code that consumes it.
 *
 * A hub item's own `href` points at its first child so the trigger stays a real,
 * keyboard-reachable link rather than a dead label.
 */
export const buildDefaultNav = (t: Translate, enabledServices?: string[]): NavItemVM[] => {
  const enabled = (service?: string) =>
    !service || !enabledServices || enabledServices.includes(service)

  const items: Array<NavItemVM & { service?: string }> = [
  {
    label: t('tours'),
    // The hub is a real page now — the combined catalogue — rather than an alias for
    // the first child, so the trigger sends a visitor somewhere better than the half
    // of the collection that happens to be listed first.
    href: '/tours',
    service: 'tours',
    children: [
      { label: t('allTours'), href: '/tours' },
      { label: t('dailyTours'), href: '/tours/daily' },
      { label: t('fullExperiences'), href: '/tours/experiences' },
    ],
  },
  {
    label: t('hotels'),
    href: '/hotels',
    service: 'hotels',
    children: [{ label: t('allHotels'), href: '/hotels' }],
  },
  {
    label: t('transfers'),
    href: '/transfers',
    service: 'transfers',
    children: [
      { label: t('airportTransfer'), href: '/transfers/airport' },
      { label: t('cityToCity'), href: '/transfers/intercity' },
      { label: t('customTrip'), href: '/transfers/custom' },
    ],
  },
  { label: t('bicycles'), href: '/bicycles', service: 'bicycles' },
  { label: t('about'), href: '/about' },
  { label: t('contact'), href: '/contact' },
  { label: t('privacyPolicy'), href: '/privacy-policy' },
  ]

  // Section 5: an item whose service is switched off in SiteSettings disappears
  // site-wide, along with any children belonging to that service.
  return items
    .filter((item) => enabled(item.service))
    .map(({ service: _service, ...item }) => item)
}

/** Spec Section 5: the header CTA. */
export const buildDefaultCta = (t: Translate): NavItemVM => ({
  label: t('bookNow'),
  href: '/tours/daily',
})
