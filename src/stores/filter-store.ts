'use client'

import { create } from 'zustand'

export type FilterState = {
  destination: string
  minPrice: number | null
  maxPrice: number | null
  duration: string
  difficulty: string
  tourType: string
  starRating: number | null
  amenities: string[]
  sortBy: string
  page: number

  set: (patch: Partial<Omit<FilterState, 'set' | 'reset' | 'hydrateFromUrl'>>) => void
  reset: () => void
  hydrateFromUrl: (params: URLSearchParams) => void
}

const initial = {
  destination: '',
  minPrice: null,
  maxPrice: null,
  duration: '',
  difficulty: '',
  tourType: '',
  starRating: null,
  amenities: [] as string[],
  sortBy: 'newest',
  page: 1,
}

/**
 * The input buffer for listing filters — NOT the source of truth.
 *
 * The URL is authoritative: the server page reads `searchParams` and renders the
 * results, so a filtered listing is server-rendered, shareable and crawlable. This
 * store only holds what the controls currently show, and `useFilterUrlSync` pushes it
 * into the URL on a 300ms debounce.
 *
 * Deliberately not persisted: a filter set belongs to the link you followed, not to
 * the browser you followed it in.
 */
export const useFilterStore = create<FilterState>()((set) => ({
  ...initial,

  // Changing any filter resets paging — page 3 of the old result set is meaningless.
  set: (patch) =>
    set((state) => ({
      ...state,
      ...patch,
      page: 'page' in patch ? (patch.page as number) : 1,
    })),

  reset: () => set({ ...initial }),

  hydrateFromUrl: (params) =>
    set({
      ...initial,
      destination: params.get('destination') ?? '',
      minPrice: params.has('minPrice') ? Number(params.get('minPrice')) : null,
      maxPrice: params.has('maxPrice') ? Number(params.get('maxPrice')) : null,
      duration: params.get('duration') ?? '',
      difficulty: params.get('difficulty') ?? '',
      tourType: params.get('tourType') ?? '',
      starRating: params.has('starRating') ? Number(params.get('starRating')) : null,
      amenities: params.getAll('amenities'),
      sortBy: params.get('sortBy') ?? 'newest',
      page: Number(params.get('page')) || 1,
    }),
}))

/** Serialises the store into search params, omitting anything at its default. */
export const filtersToSearchParams = (state: FilterState): URLSearchParams => {
  const params = new URLSearchParams()

  if (state.destination) params.set('destination', state.destination)
  if (state.minPrice !== null) params.set('minPrice', String(state.minPrice))
  if (state.maxPrice !== null) params.set('maxPrice', String(state.maxPrice))
  if (state.duration) params.set('duration', state.duration)
  if (state.difficulty) params.set('difficulty', state.difficulty)
  if (state.tourType) params.set('tourType', state.tourType)
  if (state.starRating !== null) params.set('starRating', String(state.starRating))
  for (const amenity of state.amenities) params.append('amenities', amenity)
  if (state.sortBy && state.sortBy !== 'newest') params.set('sortBy', state.sortBy)
  if (state.page > 1) params.set('page', String(state.page))

  return params
}
