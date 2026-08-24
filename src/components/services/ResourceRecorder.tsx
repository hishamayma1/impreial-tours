'use client'

import { useRecordResource } from '@/hooks/use-cached-resource'
import type { ResourceKind } from '@/stores/resource-store'

/**
 * Records what the server just rendered into the client resource cache. Renders
 * nothing — it exists so a server component can seed the cache without becoming a
 * client component itself.
 */
export const ResourceRecorder = <T,>({
  kind,
  locale,
  filters,
  data,
}: {
  kind: ResourceKind
  locale: string
  filters: Record<string, unknown>
  data: T
}) => {
  useRecordResource(kind, locale, filters, data)
  return null
}
