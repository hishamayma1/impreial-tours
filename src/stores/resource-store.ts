'use client'

import { create } from 'zustand'

/**
 * A short-lived client cache for the service listings whose data keeps changing —
 * tours, hotel rooms, transfers and bicycle rentals.
 *
 * The server stays the source of truth: every listing is server-rendered from the URL,
 * and that render is what search engines and first-time visitors get. This store only
 * remembers what was last rendered, keyed by route + filters, so that going back to a
 * listing repaints instantly from memory while the fresh server response streams in
 * behind it.
 *
 * Deliberately NOT persisted. Prices and availability go stale, and a booking flow
 * that shows yesterday's price from localStorage is worse than one that waits.
 * Entries also expire on a TTL for the same reason.
 */

const TTL_MS = 60_000
const MAX_ENTRIES = 30

export type ResourceKind = 'tours' | 'hotels' | 'transfers' | 'bicycles'

type Entry<T = unknown> = {
  data: T
  storedAt: number
}

type ResourceState = {
  entries: Record<string, Entry>
  /** Records a server-rendered payload so a later visit can paint from it. */
  put: <T>(key: string, data: T) => void
  /** Returns the cached payload, or null when absent or past its TTL. */
  get: <T>(key: string) => T | null
  invalidate: (kind?: ResourceKind) => void
}

/** Stable cache key: same filters in any order produce the same string. */
export const resourceKey = (
  kind: ResourceKind,
  locale: string,
  filters: Record<string, unknown> = {},
): string => {
  const stable = Object.keys(filters)
    .filter((key) => filters[key] !== undefined && filters[key] !== '')
    .sort()
    .map((key) => `${key}=${String(filters[key])}`)
    .join('&')

  return `${kind}:${locale}${stable ? `:${stable}` : ''}`
}

export const useResourceStore = create<ResourceState>()((set, get) => ({
  entries: {},

  put: (key, data) =>
    set((state) => {
      const entries = { ...state.entries, [key]: { data, storedAt: Date.now() } }

      // Bounded so a visitor who tries many filter combinations cannot grow this
      // without limit; the oldest entry goes first.
      const keys = Object.keys(entries)
      if (keys.length > MAX_ENTRIES) {
        const oldest = keys.reduce((a, b) =>
          entries[a].storedAt <= entries[b].storedAt ? a : b,
        )
        delete entries[oldest]
      }

      return { entries }
    }),

  get: <T,>(key: string): T | null => {
    const entry = get().entries[key]
    if (!entry) return null
    if (Date.now() - entry.storedAt > TTL_MS) return null
    return entry.data as T
  },

  invalidate: (kind) =>
    set((state) => {
      if (!kind) return { entries: {} }
      const entries = { ...state.entries }
      for (const key of Object.keys(entries)) {
        if (key.startsWith(`${kind}:`)) delete entries[key]
      }
      return { entries }
    }),
}))
