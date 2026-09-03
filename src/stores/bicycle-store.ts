'use client'

import { create } from 'zustand'

export type BicycleFilterState = {
  q: string
  /** '' means both rentals and guided rides. */
  bikeType: string
  /** Multi-select: an empty array means "no constraint", never "none of them". */
  category: string[]
  destination: string
  difficulty: string[]
  frameSizes: string[]
  /** How long the visitor wants the bike — 'hour' | 'halfDay' | 'fullDay' | 'multiDay'. */
  window: string
  electric: boolean
  minPrice: number | null
  maxPrice: number | null
  sortBy: string
  page: number

  /**
   * Whether a filter change is still in flight — the debounced URL write plus the
   * server re-render it triggers. Purely a UI signal: never read from or written to
   * the URL, so it is excluded from `hydrateFromUrl` and `bicyclesToSearchParams`.
   * Lets `BicycleResultsPending` show that a click did something during the window
   * where React (correctly) keeps the previous results on screen rather than
   * blanking them, which otherwise reads as the filter having no effect.
   */
  pending: boolean
  setPending: (pending: boolean) => void

  set: (
    patch: Partial<
      Omit<BicycleFilterState, 'set' | 'toggle' | 'reset' | 'hydrateFromUrl' | 'setPending'>
    >,
  ) => void
  /** Adds or removes one value from a multi-select facet. */
  toggle: (key: 'category' | 'difficulty' | 'frameSizes', value: string) => void
  reset: () => void
  hydrateFromUrl: (params: URLSearchParams) => void
}

const initial = {
  q: '',
  bikeType: '',
  category: [] as string[],
  destination: '',
  difficulty: [] as string[],
  frameSizes: [] as string[],
  window: '',
  electric: false,
  minPrice: null as number | null,
  maxPrice: null as number | null,
  sortBy: 'newest',
  page: 1,
}

/**
 * The input buffer for the bicycles listing — NOT the source of truth.
 *
 * Same contract as the catalogue and hotels stores: the URL is authoritative, the
 * server renders from `searchParams`, and `useStoreUrlSync` debounces this into the
 * address bar. Deliberately its own store rather than a widened catalogue one, because
 * the two listings share almost no vocabulary — this one filters on frame sizes, motor
 * assistance and how many hours you want the thing for, none of which mean anything to
 * a tour.
 *
 * Not persisted, for the same reason as the others: a filter set belongs to the link
 * you followed, not to the browser you followed it in.
 */
export const useBicycleStore = create<BicycleFilterState>()((set) => ({
  ...initial,

  // Not part of `initial`: `reset`/`hydrateFromUrl` below spread `initial` over the
  // state with zustand's shallow merge, and this is not a filter either of them
  // should touch.
  pending: false,
  setPending: (pending) => set({ pending }),

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
      bikeType: params.get('bikeType') ?? '',
      category: params.getAll('category'),
      destination: params.get('destination') ?? '',
      difficulty: params.getAll('difficulty'),
      frameSizes: params.getAll('frameSizes'),
      window: params.get('window') ?? '',
      electric: params.get('electric') === '1',
      minPrice: params.has('minPrice') ? Number(params.get('minPrice')) : null,
      maxPrice: params.has('maxPrice') ? Number(params.get('maxPrice')) : null,
      sortBy: params.get('sortBy') ?? 'newest',
      page: Number(params.get('page')) || 1,
    }),
}))

/**
 * Serialises the store into search params, omitting anything at its default — which is
 * what keeps `/bicycles` itself the canonical URL for the unfiltered listing.
 */
export const bicyclesToSearchParams = (state: BicycleFilterState): URLSearchParams => {
  const params = new URLSearchParams()

  if (state.q.trim()) params.set('q', state.q.trim())
  if (state.bikeType) params.set('bikeType', state.bikeType)
  for (const value of state.category) params.append('category', value)
  if (state.destination) params.set('destination', state.destination)
  for (const value of state.difficulty) params.append('difficulty', value)
  for (const value of state.frameSizes) params.append('frameSizes', value)
  if (state.window) params.set('window', state.window)
  if (state.electric) params.set('electric', '1')
  if (state.minPrice !== null) params.set('minPrice', String(state.minPrice))
  if (state.maxPrice !== null) params.set('maxPrice', String(state.maxPrice))
  if (state.sortBy && state.sortBy !== 'newest') params.set('sortBy', state.sortBy)
  if (state.page > 1) params.set('page', String(state.page))

  return params
}

/** How many facets are narrowing the list — the badge on the mobile trigger. */
export const countActiveBicycleFilters = (state: BicycleFilterState): number =>
  (state.q.trim() ? 1 : 0) +
  (state.bikeType ? 1 : 0) +
  state.category.length +
  (state.destination ? 1 : 0) +
  state.difficulty.length +
  state.frameSizes.length +
  (state.window ? 1 : 0) +
  (state.electric ? 1 : 0) +
  (state.minPrice !== null ? 1 : 0) +
  (state.maxPrice !== null ? 1 : 0)
