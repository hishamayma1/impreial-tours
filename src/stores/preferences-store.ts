'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import type { CurrencyVM } from '@/types/content'

type PreferencesState = {
  currency: string
  hydrated: boolean
  setCurrency: (code: string) => void
  setHydrated: (hydrated: boolean) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      /**
       * Empty rather than hard-coded 'USD': every reader of this value already
       * falls back to `currencies[0]` (the site's configured default, from
       * SiteSettings.defaultCurrency — see toSiteSettings) whenever the code
       * doesn't match one on offer, and an empty string never matches. Starting
       * this at 'USD' baked that in permanently on first hydration (see the
       * healing effect in CurrencySwitcher), which is what made the dashboard's
       * default currency setting look like it did nothing — every visitor's
       * browser had already decided "USD" before the site's own default was
       * ever consulted.
       */
      currency: '',
      hydrated: false,
      setCurrency: (currency) => set({ currency }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      // Bumped to `.v2`: every visitor before this fix already had 'USD' written
      // here under the old key (see the comment on `currency` above), which this
      // change alone would otherwise never override for a returning browser. The
      // old key is simply abandoned — a few stray bytes in localStorage, not
      // worth a migration.
      name: 'imperial-tours.preferences.v2',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ currency }) => ({ currency }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
)

/**
 * Prices are authored in USD; the switcher only changes presentation. Rendering the
 * base currency until the store hydrates avoids a server/client text mismatch.
 */
export const formatPrice = (
  amountUsd: number,
  currency: CurrencyVM | undefined,
  locale: string,
): string => {
  const rate = currency?.rate ?? 1
  const code = currency?.code ?? 'USD'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amountUsd * rate)
  } catch {
    return `${currency?.symbol ?? '$'}${Math.round(amountUsd * rate)}`
  }
}
