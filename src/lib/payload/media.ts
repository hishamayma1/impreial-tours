import 'server-only'

import type { ImageVM } from '@/types/content'

import { getPayloadClient } from './client'
import { cached } from './services'
import { toImage } from './mappers'

type Doc = Record<string, any>

/**
 * Resolves uploads by filename into a lookup the editorial pages can read.
 *
 * The About page is hand-built rather than assembled from CMS blocks, but its
 * photographs still come out of the Media library rather than being hard-coded
 * `/media/…` paths: that way an editor replacing a picture in the admin changes the
 * page, and the size variants and alt text come along with it.
 *
 * A filename with no match resolves to `null` rather than throwing, and `CmsImage`
 * renders a neutral surface for a null image — so a deleted or renamed upload leaves
 * a gap in the layout instead of taking the page down.
 */
export const getMediaByFilenames = cached(
  'media',
  {} as Record<string, ImageVM | null>,
  async (filenames: string[], size: string = 'wide'): Promise<Record<string, ImageVM | null>> => {
    if (!filenames.length) return {}

    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'media',
      where: { filename: { in: filenames } },
      limit: filenames.length,
      depth: 0,
      overrideAccess: true,
    })

    const byName = new Map(docs.map((doc) => [String((doc as Doc).filename), doc as Doc]))

    return Object.fromEntries(
      filenames.map((filename) => [filename, toImage(byName.get(filename), size)]),
    )
  },
  'media-by-filename',
)
