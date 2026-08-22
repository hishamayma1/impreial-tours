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
export const buildDefaultNav = (t: Translate): NavItemVM[] => [
  {
    label: t('tours'),
    href: '/tours/daily',
    children: [
      { label: t('dailyTours'), href: '/tours/daily' },
      { label: t('fullExperiences'), href: '/tours/experiences' },
    ],
  },
  { label: t('hotels'), href: '/hotels' },
  {
    label: t('transfers'),
    href: '/transfers',
    children: [
      { label: t('airportTransfer'), href: '/transfers/airport' },
      { label: t('cityToCity'), href: '/transfers/intercity' },
      { label: t('customTrip'), href: '/transfers/custom' },
    ],
  },
  { label: t('bicycles'), href: '/bicycles' },
  { label: t('about'), href: '/about' },
  { label: t('contact'), href: '/contact' },
]

/** Spec Section 5: the header CTA. */
export const buildDefaultCta = (t: Translate): NavItemVM => ({
  label: t('bookNow'),
  href: '/tours/daily',
})
