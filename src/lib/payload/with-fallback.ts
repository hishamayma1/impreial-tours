/**
 * Wraps a read so that a thrown error resolves to `fallback` instead of propagating.
 *
 * Split out of `cached()` in services.ts so this — the part that actually decides what
 * an outage shows — has no dependency on `next/cache` or the `server-only` guard, and
 * can be exercised directly in a plain Node test (see tests/fallback-data.test.ts)
 * without booting Next or Payload.
 */
export const withFallback = <A extends unknown[], T>(
  loader: (...args: A) => Promise<T>,
  fallback: T | ((...args: A) => T),
  onError?: (error: unknown) => void,
) => {
  return async (...args: A): Promise<T> => {
    try {
      return await loader(...args)
    } catch (error) {
      onError?.(error)
      // `fallback` may depend on the call's own arguments (a slug, a tour type) so a
      // detail page can still resolve its one demo record during an outage, rather
      // than every slug degrading to the same empty page.
      return typeof fallback === 'function' ? (fallback as (...args: A) => T)(...args) : fallback
    }
  }
}
