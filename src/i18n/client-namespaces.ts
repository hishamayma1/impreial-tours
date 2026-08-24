/**
 * The message namespaces that reach the browser.
 *
 * `NextIntlClientProvider` serialises whatever it is given into the HTML of every
 * page, so handing it the whole catalogue ships copy for pages the visitor is not on.
 * This list is exactly the namespaces used by components marked 'use client';
 * everything else is read on the server through `getTranslations` and never sent.
 *
 * Keep it in step with the client components — a missing namespace throws at runtime
 * in the component that needs it, so `npm run check:i18n` verifies this list against
 * the source and fails if they drift.
 */
export const CLIENT_NAMESPACES = [
  'nav', // MobileNav
  'currency', // CurrencySwitcher
  'locale', // LocaleSwitcher
  'search', // SearchWidget
  'offers', // OffersCarousel
  'testimonials', // Testimonials
  'services', // ListingFilters
  'filters', // ListingFilters
  'booking', // BookingWizard + steps
  'forms', // form validation copy
  'quote', // CustomQuoteForm
] as const

export type ClientNamespace = (typeof CLIENT_NAMESPACES)[number]

/** Narrows a full message catalogue to the namespaces the browser actually needs. */
export const pickClientMessages = (
  messages: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    CLIENT_NAMESPACES.filter((namespace) => namespace in messages).map((namespace) => [
      namespace,
      messages[namespace],
    ]),
  )
