import type { CollectionConfig } from 'payload'
import { isEditor, publishedOrEditor } from '../access'
import { slugField } from '../fields/slug'
import { revalidateCollection, revalidateCollectionOnDelete } from '../hooks/revalidate'

/** Journal entries rendered by the "Latest from the Journal" section. */
export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'publishedAt', '_status'],
    group: 'Content',
  },
  versions: { drafts: true },
  defaultSort: '-publishedAt',
  access: { read: publishedOrEditor, create: isEditor, update: isEditor, delete: isEditor },
  hooks: {
    afterChange: [revalidateCollection('posts')],
    afterDelete: [revalidateCollectionOnDelete('posts')],
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'excerpt', type: 'textarea', required: true, localized: true, maxLength: 300 },
    { name: 'heroImage', type: 'upload', relationTo: 'media', required: true },
    { name: 'content', type: 'richText', localized: true },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      filterOptions: () => ({ kind: { equals: 'journal' } }),
    },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } },
    },
    slugField(),
  ],
}
