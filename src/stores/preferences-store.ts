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
      currency: 'USD',
      hydrated: false,
      setCurrency: (currency) => set({ currency }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'imperial-tours.preferences',
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
