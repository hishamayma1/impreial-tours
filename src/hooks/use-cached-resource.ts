'use client'

import { useEffect } from 'react'

import { useResourceStore, resourceKey, type ResourceKind } from '@/stores/resource-store'

/**
 * Records the payload a server component just rendered, so returning to this listing
 * within the TTL can paint from memory instead of waiting on the network again.
 *
 * Write-only by design. Reading the cache to REPLACE server-rendered output would
 * mean showing possibly-stale prices over fresh ones, which is the wrong trade for a
 * booking site. The cache exists to make a back-navigation feel instant, not to
 * override what the server just said.
 */
export const useRecordResource = <T,>(
  kind: ResourceKind,
  locale: string,
  filters: Record<string, unknown>,
  data: T,
) => {
  const put = useResourceStore((state) => state.put)

  // `filters` arrives as a fresh object literal on every server render, so comparing
  // it by reference would fire this effect constantly. The computed key is the stable
  // identity, and it is the only part of `filters` this effect actually depends on.
  const key = resourceKey(kind, locale, filters)

  useEffect(() => {
    put(key, data)
  }, [put, key, data])
}

/** Reads a cached payload, or null when absent or stale. */
export const useCachedResource = <T,>(
  kind: ResourceKind,
  locale: string,
  filters: Record<string, unknown> = {},
): T | null => useResourceStore((state) => state.get<T>(resourceKey(kind, locale, filters)))
