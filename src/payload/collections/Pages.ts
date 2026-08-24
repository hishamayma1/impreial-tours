import type { CollectionConfig } from 'payload'
import { publishedOrStaff, isEditor, isAdminOrManager, isAdminOrManagerFieldLevel } from '../access'
import { slugField } from '../fields/slug'
import { revalidateCollection, revalidateCollectionOnDelete } from '../hooks/revalidate'
import { pageBlocks } from '../blocks'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    group: 'Content',
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    read: publishedOrStaff,
    create: isEditor,
    update: isEditor,
    delete: isAdminOrManager,
  },
  hooks: {
    afterChange: [revalidateCollection('pages')],
    afterDelete: [revalidateCollectionOnDelete('pages')],
  },
  fields: [
    {
      name: '_status',
      type: 'select',
      // Editors draft, managers publish.
      access: { update: isAdminOrManagerFieldLevel },
      admin: { hidden: true },
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
    { name: 'title', type: 'text', required: true, localized: true },
    slugField({ from: 'title' }),
    { name: 'layout', type: 'blocks', blocks: pageBlocks, localized: false },
    {
      name: 'seo',
      type: 'group',
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'description', type: 'textarea', localized: true, maxLength: 200 },
        { name: 'image', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}
