import type { CollectionConfig } from 'payload'
import { isEditor, publishedOrEditor } from '../access'
import { revalidateCollection, revalidateCollectionOnDelete } from '../hooks/revalidate'

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  admin: {
    useAsTitle: 'author',
    defaultColumns: ['author', 'location', 'order', '_status'],
    group: 'Content',
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
    { name: 'portrait', type: 'upload', relationTo: 'media' },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
