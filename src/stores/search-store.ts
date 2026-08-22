'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const TOUR_TYPES = ['private', 'group', 'yacht', 'villa'] as const
export type TourType = (typeof TOUR_TYPES)[number]

export type SearchCriteria = {
  destination: string
  travelDate: string
  tourType: TourType
  guests: number
}

type SearchState = SearchCriteria & {
  submitting: boolean
  lastReference: string | null
  hydrated: boolean
  setField: <K extends keyof SearchCriteria>(key: K, value: SearchCriteria[K]) => void
  setHydrated: (hydrated: boolean) => void
  setSubmitting: (submitting: boolean) => void
  setLastReference: (reference: string | null) => void
  applyDefaults: (defaults: Partial<SearchCriteria>) => void
  reset: () => void
}

const initial: SearchCriteria = {
  destination: '',
  travelDate: '',
  tourType: 'private',
  guests: 2,
}

/**
 * Survives navigation so a traveller who wanders off to a tour page and comes back
 * still has their criteria. Session-scoped: it should not follow them to tomorrow.
 */
export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      ...initial,
      submitting: false,
      lastReference: null,
      hydrated: false,
      setField: (key, value) => set({ [key]: value } as unknown as Partial<SearchState>),
      setHydrated: (hydrated) => set({ hydrated }),
      setSubmitting: (submitting) => set({ submitting }),
      setLastReference: (lastReference) => set({ lastReference }),
      applyDefaults: (defaults) => {
        // Only fill blanks — never clobber what the visitor already typed.
        const state = get()
        const patch: Partial<SearchCriteria> = {}
        if (!state.destination && defaults.destination) patch.destination = defaults.destination
        if (!state.travelDate && defaults.travelDate) patch.travelDate = defaults.travelDate
        if (Object.keys(patch).length > 0) set(patch)
      },
      reset: () => set({ ...initial, submitting: false, lastReference: null }),
    }),
    {
      name: 'imperial-tours.search',
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ destination, travelDate, tourType, guests }) => ({
        destination,
        travelDate,
        tourType,
        guests,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
)
