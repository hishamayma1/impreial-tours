import type { CollectionConfig } from 'payload'
import { anyone, isEditor } from '../access'
import { slugField } from '../fields/slug'
import { revalidateCollection, revalidateCollectionOnDelete } from '../hooks/revalidate'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'kind', 'slug'],
    group: 'Taxonomy',
  },
  access: { read: anyone, create: isEditor, update: isEditor, delete: isEditor },
  hooks: {
    afterChange: [revalidateCollection('categories')],
    afterDelete: [revalidateCollectionOnDelete('categories')],
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'journal',
      options: [
        { label: 'Journal', value: 'journal' },
        { label: 'Tour', value: 'tour' },
      ],
    },
    slugField(),
  ],
}
