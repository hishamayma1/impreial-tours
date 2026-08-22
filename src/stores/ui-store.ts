'use client'

import { create } from 'zustand'

type UIState = {
  mobileNavOpen: boolean
  localeMenuOpen: boolean
  currencyMenuOpen: boolean
  openMobileNav: () => void
  closeMobileNav: () => void
  toggleMobileNav: () => void
  setLocaleMenu: (open: boolean) => void
  setCurrencyMenu: (open: boolean) => void
  closeAll: () => void
}

/**
 * Ephemeral chrome state. Deliberately not persisted — a reopened tab should never
 * restore an open menu.
 */
export const useUIStore = create<UIState>()((set) => ({
  mobileNavOpen: false,
  localeMenuOpen: false,
  currencyMenuOpen: false,
  openMobileNav: () => set({ mobileNavOpen: true, localeMenuOpen: false, currencyMenuOpen: false }),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  toggleMobileNav: () => set((state) => ({ mobileNavOpen: !state.mobileNavOpen })),
  setLocaleMenu: (open) => set({ localeMenuOpen: open, currencyMenuOpen: false }),
  setCurrencyMenu: (open) => set({ currencyMenuOpen: open, localeMenuOpen: false }),
  closeAll: () => set({ mobileNavOpen: false, localeMenuOpen: false, currencyMenuOpen: false }),
}))
