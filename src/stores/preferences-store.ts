'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import type { CurrencyVM } from '@/types/content'

type PreferencesState = {
  currency: string
  /**
   * Distinguishes a visitor's own pick (the switcher's onClick calls `setCurrency`)
   * from the app quietly resolving the site's default. Without this flag, the two
   * looked identical once written — `currency: 'EGP'` either way — so CurrencySwitcher
   * had no way to tell "this visitor chose EGP" from "this visitor got EGP because
   * that happened to be the default when they first loaded the page". The second
   * case must keep tracking SiteSettings.defaultCurrency for as long as nobody has
   * actually chosen otherwise; the first must not be overridden by a later admin
   * change. `syncDefaultCurrency` updates the former without touching this flag.
   */
  chosen: boolean
  hydrated: boolean
  setCurrency: (code: string) => void
  syncDefaultCurrency: (code: string) => void
  setHydrated: (hydrated: boolean) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      currency: '',
      chosen: false,
      hydrated: false,
      setCurrency: (currency) => set({ currency, chosen: true }),
      syncDefaultCurrency: (currency) => set({ currency }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      // Bumped to `.v2`: every visitor before this fix already had 'USD' written
      // here under the old key, permanently, with no `chosen` flag to tell it apart
      // from a real pick. The old key is simply abandoned — a few stray bytes in
      // localStorage, not worth a migration.
      name: 'imperial-tours.preferences.v2',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ currency, chosen }) => ({ currency, chosen }),
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
