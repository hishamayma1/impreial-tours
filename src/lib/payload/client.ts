import 'server-only'
import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Payload's local API talks to MongoDB in-process — no HTTP hop, no serialization.
 * `cache` dedupes the (expensive) init across a single React render pass.
 */
export const getPayloadClient = cache(async () => getPayload({ config }))
