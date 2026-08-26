import path from 'path'

import type { CollectionConfig } from 'payload'
import { anyone, isEditor } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'Content' },
  access: {
    read: anyone,
    create: isEditor,
    update: isEditor,
    delete: isEditor,
  },
  upload: {
    /**
     * Uploads live under `public/` so Next serves them as ordinary static files.
     *
     * Payload's own file route is `/api/media/file/<name>`, and every request to it
     * goes through Payload's REST layer and access control — per image, per size
     * variant. On a cold start that was taking seconds, and it was slow enough that
     * Next's image optimizer gave up on the hero with "upstream image response timed
     * out". Serving from `public/` skips Payload entirely for reads, and lets
     * `next/image` treat the path as local: it reads the file off disk instead of
     * making an HTTP round trip back into this same server.
     *
     * `toImage` in lib/payload/mappers.ts builds the public `/media/...` URL from the
     * stored filename; the admin panel keeps using the API route, which is correct —
     * it is the one caller that genuinely wants access control.
     *
     * Resolved from `process.cwd()` (the project root under both `next dev` and
     * `next start`) rather than from `import.meta.url`, whose depth relative to the
     * source tree does not survive bundling. `restore-media.ts` resolves it the same
     * way, so the two cannot drift.
     */
    staticDir: path.resolve(process.cwd(), 'public', 'media'),
    mimeTypes: ['image/*'],
    focalPoint: true,
    formatOptions: {
      format: 'webp',
      options: { quality: 82 },
    },
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 576, position: 'centre' },
      { name: 'portrait', width: 800, height: 1000, position: 'centre' },
      { name: 'wide', width: 1600, height: 900, position: 'centre' },
      { name: 'hero', width: 2400, height: undefined, position: 'centre' },
      { name: 'og', width: 1200, height: 630, position: 'centre' },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      localized: true,
      admin: { description: 'Describe the image for screen readers and search engines.' },
    },
    { name: 'credit', type: 'text' },
  ],
}
