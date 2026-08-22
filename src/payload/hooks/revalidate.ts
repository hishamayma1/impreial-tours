import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

/**
 * `revalidateTag` needs a Next request context. Scripts run through `payload run`
 * (seeding, migrations) have none, and there is no cache to bust there either, so
 * that specific failure is expected rather than an error worth logging.
 */
const isOutsideRequestContext = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('static generation store missing')

/**
 * Every read in src/lib/payload/queries.ts is wrapped in `unstable_cache` and tagged
 * with the collection/global slug. Writing through the admin panel busts that tag, so
 * the public site is fully static between edits but never stale after one.
 */
export const revalidateCollection =
  (tag: string): CollectionAfterChangeHook =>
  ({ doc, req }) => {
    try {
      revalidateTag(tag)
      req.payload.logger.info(`Revalidated tag "${tag}"`)
    } catch (err) {
      if (!isOutsideRequestContext(err)) {
        req.payload.logger.error({ err }, `Failed to revalidate tag "${tag}"`)
      }
    }
    return doc
  }

export const revalidateCollectionOnDelete =
  (tag: string): CollectionAfterDeleteHook =>
  ({ doc, req }) => {
    try {
      revalidateTag(tag)
    } catch (err) {
      if (!isOutsideRequestContext(err)) {
        req.payload.logger.error({ err }, `Failed to revalidate tag "${tag}"`)
      }
    }
    return doc
  }

export const revalidateGlobal =
  (tag: string): GlobalAfterChangeHook =>
  ({ doc, req }) => {
    try {
      revalidateTag(tag)
      req.payload.logger.info(`Revalidated tag "${tag}"`)
    } catch (err) {
      if (!isOutsideRequestContext(err)) {
        req.payload.logger.error({ err }, `Failed to revalidate tag "${tag}"`)
      }
    }
    return doc
  }
