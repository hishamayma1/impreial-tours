'use client'

import { create } from 'zustand'

export type CatalogFilterState = {
  q: string
  /** '' means both daily tours and full experiences. */
  type: string
  destination: string
  /** Multi-select: an empty array means "no constraint", never "none of them". */
  difficulty: string[]
  languages: string[]
  duration: string[]
  badge: string
  minPrice: number | null
  maxPrice: number | null
  minRating: number | null
  sortBy: string
  page: number

  set: (patch: Partial<Omit<CatalogFilterState, 'set' | 'toggle' | 'reset' | 'hydrateFromUrl'>>) => void
  /** Adds or removes one value from a multi-select facet. */
  toggle: (key: 'difficulty' | 'languages' | 'duration', value: string) => void
  reset: () => void
  hydrateFromUrl: (params: URLSearchParams) => void
}

const initial = {
  q: '',
  type: '',
  destination: '',
  difficulty: [] as string[],
  languages: [] as string[],
  duration: [] as string[],
  badge: '',
  minPrice: null as number | null,
  maxPrice: null as number | null,
  minRating: null as number | null,
  sortBy: 'newest',
  page: 1,
}

/**
 * The input buffer for the `/tours` catalogue filters — NOT the source of truth.
 *
 * The URL is authoritative: the page reads `searchParams` and renders the results on
 * the server, so a filtered catalogue is server-rendered, shareable and crawlable.
 * This store only holds what the controls currently show; `useCatalogUrlSync` pushes
 * it into the URL on a debounce.
 *
 * Deliberately separate from `filter-store`, which serves the two single-type
 * listings. That store models each facet as a single value; this one is
 * multi-select across four of them, and widening the shared store to arrays would
 * have rewritten the hotels and daily-tour filter bars for no benefit to either.
 *
 * Also deliberately not persisted: a filter set belongs to the link you followed, not
 * to the browser you followed it in.
 */
export const useCatalogStore = create<CatalogFilterState>()((set) => ({
  ...initial,

  // Changing any filter resets paging — page 3 of the previous result set is
  // meaningless, and usually empty.
  set: (patch) =>
    set((state) => ({
      ...state,
      ...patch,
      page: 'page' in patch ? (patch.page as number) : 1,
    })),

  toggle: (key, value) =>
    set((state) => {
      const current = state[key]
      return {
        ...state,
        [key]: current.includes(value)
          ? current.filter((entry) => entry !== value)
          : [...current, value],
        page: 1,
      }
    }),

  reset: () => set({ ...initial }),

  hydrateFromUrl: (params) =>
    set({
      ...initial,
      q: params.get('q') ?? '',
      type: params.get('type') ?? '',
      destination: params.get('destination') ?? '',
      difficulty: params.getAll('difficulty'),
      languages: params.getAll('lang'),
      duration: params.getAll('duration'),
      badge: params.get('badge') ?? '',
      minPrice: params.has('minPrice') ? Number(params.get('minPrice')) : null,
      maxPrice: params.has('maxPrice') ? Number(params.get('maxPrice')) : null,
      minRating: params.has('minRating') ? Number(params.get('minRating')) : null,
      sortBy: params.get('sortBy') ?? 'newest',
      page: Number(params.get('page')) || 1,
    }),
}))

/**
 * Serialises the store into search params, omitting anything sitting at its default.
 *
 * Omitting defaults is what keeps `/tours` itself the canonical URL for the unfiltered
 * catalogue: without it every visit would rewrite to `/tours?type=&sortBy=newest`,
 * which is the same page under a different address as far as a crawler is concerned.
 *
 * Key names are shortened where the long form adds nothing — `lang` rather than
 * `languages` — because these appear in a link people paste to each other.
 */
export const catalogToSearchParams = (state: CatalogFilterState): URLSearchParams => {
  const params = new URLSearchParams()

  if (state.q.trim()) params.set('q', state.q.trim())
  if (state.type) params.set('type', state.type)
  if (state.destination) params.set('destination', state.destination)
  for (const value of state.difficulty) params.append('difficulty', value)
  for (const value of state.languages) params.append('lang', value)
  for (const value of state.duration) params.append('duration', value)
  if (state.badge) params.set('badge', state.badge)
  if (state.minPrice !== null) params.set('minPrice', String(state.minPrice))
  if (state.maxPrice !== null) params.set('maxPrice', String(state.maxPrice))
  if (state.minRating !== null) params.set('minRating', String(state.minRating))
  if (state.sortBy && state.sortBy !== 'newest') params.set('sortBy', state.sortBy)
  if (state.page > 1) params.set('page', String(state.page))

  return params
}

/** How many facets are narrowing the list right now — the badge on the mobile trigger. */
export const countActiveCatalogFilters = (state: CatalogFilterState): number =>
  (state.q.trim() ? 1 : 0) +
  (state.type ? 1 : 0) +
  (state.destination ? 1 : 0) +
  (state.badge ? 1 : 0) +
  state.difficulty.length +
  state.languages.length +
  state.duration.length +
  (state.minPrice !== null ? 1 : 0) +
  (state.maxPrice !== null ? 1 : 0) +
  (state.minRating !== null ? 1 : 0)
