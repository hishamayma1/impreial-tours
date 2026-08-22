'use client'

import { create } from 'zustand'

export type Toast = { id: string; message: string; tone: 'success' | 'error' }

type UIState = {
  mobileNavOpen: boolean
  localeMenuOpen: boolean
  currencyMenuOpen: boolean
  /** Spec Section 6 additions. */
  filterSheetOpen: boolean
  galleryLightbox: { open: boolean; index: number }
  activeToast: Toast | null
  openMobileNav: () => void
  closeMobileNav: () => void
  toggleMobileNav: () => void
  setLocaleMenu: (open: boolean) => void
  setCurrencyMenu: (open: boolean) => void
  setFilterSheet: (open: boolean) => void
  openLightbox: (index: number) => void
  closeLightbox: () => void
  showToast: (message: string, tone?: Toast['tone']) => void
  dismissToast: () => void
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
  filterSheetOpen: false,
  galleryLightbox: { open: false, index: 0 },
  activeToast: null,
  openMobileNav: () => set({ mobileNavOpen: true, localeMenuOpen: false, currencyMenuOpen: false }),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  toggleMobileNav: () => set((state) => ({ mobileNavOpen: !state.mobileNavOpen })),
  setLocaleMenu: (open) => set({ localeMenuOpen: open, currencyMenuOpen: false }),
  setCurrencyMenu: (open) => set({ currencyMenuOpen: open, localeMenuOpen: false }),
  setFilterSheet: (filterSheetOpen) => set({ filterSheetOpen }),
  openLightbox: (index) => set({ galleryLightbox: { open: true, index } }),
  closeLightbox: () => set({ galleryLightbox: { open: false, index: 0 } }),
  showToast: (message, tone = 'success') =>
    // A fresh id on every call so repeating the same message still re-triggers the UI.
    set({ activeToast: { id: `${Date.now()}`, message, tone } }),
  dismissToast: () => set({ activeToast: null }),
  closeAll: () =>
    set({
      mobileNavOpen: false,
      localeMenuOpen: false,
      currencyMenuOpen: false,
      filterSheetOpen: false,
    }),
}))
