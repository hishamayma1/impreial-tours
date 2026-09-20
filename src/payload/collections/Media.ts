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
     * Files are stored on UploadThing (wired up in payload.config.ts via
     * `uploadthingStorage`), not on local disk — Vercel's serverless filesystem is
     * read-only at runtime, so writing into `public/` there always failed. The
     * adapter uploads the file and each generated size variant, then stores their
     * CDN URLs directly on the document; `toImage` in lib/payload/mappers.ts reads
     * `doc.url` / `size.url` rather than building a local `/media/...` path.
     */
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
