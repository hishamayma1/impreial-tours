'use client'

import { create } from 'zustand'

export type HotelFilterState = {
  q: string
  destination: string
  /** Minimum stars, as a string so it can live in a select. '' means any. */
  stars: string
  amenities: string[]
  minPrice: number | null
  maxPrice: number | null
  sortBy: string
  page: number

  set: (patch: Partial<Omit<HotelFilterState, 'set' | 'toggleAmenity' | 'reset' | 'hydrateFromUrl'>>) => void
  toggleAmenity: (value: string) => void
  reset: () => void
  hydrateFromUrl: (params: URLSearchParams) => void
}

const initial = {
  q: '',
  destination: '',
  stars: '',
  amenities: [] as string[],
  minPrice: null as number | null,
  maxPrice: null as number | null,
  sortBy: 'newest',
  page: 1,
}

/**
 * The input buffer for the hotels listing — NOT the source of truth.
 *
 * Same contract as the tours catalogue store: the URL is authoritative, the server
 * renders from `searchParams`, and `useStoreUrlSync` debounces this into the address
 * bar. Separate from it because the two listings filter on different things — stars
 * and amenities here, pace and duration there — and widening one store to cover both
 * would leave every control checking which page it was on.
 */
export const useHotelStore = create<HotelFilterState>()((set) => ({
  ...initial,

  // Changing any filter resets paging — page 3 of the previous result set is
  // meaningless, and usually empty.
  set: (patch) =>
    set((state) => ({
      ...state,
      ...patch,
      page: 'page' in patch ? (patch.page as number) : 1,
    })),

  toggleAmenity: (value) =>
    set((state) => ({
      ...state,
      amenities: state.amenities.includes(value)
        ? state.amenities.filter((entry) => entry !== value)
        : [...state.amenities, value],
      page: 1,
    })),

  reset: () => set({ ...initial }),

  hydrateFromUrl: (params) =>
    set({
      ...initial,
      q: params.get('q') ?? '',
      destination: params.get('destination') ?? '',
      stars: params.get('stars') ?? '',
      amenities: params.getAll('amenities'),
      minPrice: params.has('minPrice') ? Number(params.get('minPrice')) : null,
      maxPrice: params.has('maxPrice') ? Number(params.get('maxPrice')) : null,
      sortBy: params.get('sortBy') ?? 'newest',
      page: Number(params.get('page')) || 1,
    }),
}))

/**
 * Serialises the store into search params, omitting anything at its default — which
 * is what keeps `/hotels` itself the canonical URL for the unfiltered listing.
 */
export const hotelsToSearchParams = (state: HotelFilterState): URLSearchParams => {
  const params = new URLSearchParams()

  if (state.q.trim()) params.set('q', state.q.trim())
  if (state.destination) params.set('destination', state.destination)
  if (state.stars) params.set('stars', state.stars)
  for (const amenity of state.amenities) params.append('amenities', amenity)
  if (state.minPrice !== null) params.set('minPrice', String(state.minPrice))
  if (state.maxPrice !== null) params.set('maxPrice', String(state.maxPrice))
  if (state.sortBy && state.sortBy !== 'newest') params.set('sortBy', state.sortBy)
  if (state.page > 1) params.set('page', String(state.page))

  return params
}

/** How many facets are narrowing the list — the badge on the mobile trigger. */
export const countActiveHotelFilters = (state: HotelFilterState): number =>
  (state.q.trim() ? 1 : 0) +
  (state.destination ? 1 : 0) +
  (state.stars ? 1 : 0) +
  state.amenities.length +
  (state.minPrice !== null ? 1 : 0) +
  (state.maxPrice !== null ? 1 : 0)
