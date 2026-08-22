import type { CollectionConfig } from 'payload'
import { isEditor, publishedOrEditor } from '../access'
import { slugField } from '../fields/slug'
import { revalidateCollection, revalidateCollectionOnDelete } from '../hooks/revalidate'

export const Destinations: CollectionConfig = {
  slug: 'destinations',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'country', 'featured', 'order', '_status'],
    group: 'Content',
  },
  versions: { drafts: true },
  defaultSort: 'order',
  access: { read: publishedOrEditor, create: isEditor, update: isEditor, delete: isEditor },
  hooks: {
    afterChange: [revalidateCollection('destinations')],
    afterDelete: [revalidateCollectionOnDelete('destinations')],
  },
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
    { name: 'country', type: 'text', defaultValue: 'Egypt', localized: true },
    { name: 'summary', type: 'textarea', localized: true, maxLength: 300 },
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Show in the homepage Featured Destinations grid.',
      },
    },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
    slugField({ from: 'name' }),
  ],
}
