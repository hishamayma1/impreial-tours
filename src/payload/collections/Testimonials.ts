import type { CollectionConfig } from 'payload'
import { isEditor, publishedOrEditor } from '../access'
import { revalidateCollection, revalidateCollectionOnDelete } from '../hooks/revalidate'

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  admin: {
    useAsTitle: 'author',
    defaultColumns: ['author', 'location', 'rating', 'order', '_status'],
    group: 'Content',
    description:
      'Client feedback for the home page carousel. Publish an entry to add it; lower "order" numbers show first.',
  },
  versions: { drafts: true },
  defaultSort: 'order',
  access: { read: publishedOrEditor, create: isEditor, update: isEditor, delete: isEditor },
  hooks: {
    afterChange: [revalidateCollection('testimonials')],
    afterDelete: [revalidateCollectionOnDelete('testimonials')],
  },
  fields: [
    {
      name: 'quote',
      type: 'textarea',
      required: true,
      localized: true,
      maxLength: 400,
      admin: { description: 'Typographic quote marks are added by the layout.' },
    },
    { name: 'author', type: 'text', required: true },
    { name: 'location', type: 'text', localized: true },
    {
      name: 'rating',
      type: 'number',
      min: 1,
      max: 5,
      admin: { step: 1, description: 'Optional, 1–5. Shown as stars on the card; leave empty for none.' },
    },
    { name: 'portrait', type: 'upload', relationTo: 'media' },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
