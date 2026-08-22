import type { CollectionConfig } from 'payload'
import { isEditor, publishedOrEditor } from '../access'
import { slugField } from '../fields/slug'
import { revalidateCollection, revalidateCollectionOnDelete } from '../hooks/revalidate'

/** The "Our Services" cards — the categories of travel Imperial Tours sells. */
export const Services: CollectionConfig = {
  slug: 'services',
  labels: { singular: 'Service', plural: 'Services' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'icon', 'order', '_status'],
    group: 'Content',
  },
  versions: { drafts: true },
  defaultSort: 'order',
  access: { read: publishedOrEditor, create: isEditor, update: isEditor, delete: isEditor },
  hooks: {
    afterChange: [revalidateCollection('services')],
    afterDelete: [revalidateCollectionOnDelete('services')],
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      localized: true,
      maxLength: 240,
    },
    {
      name: 'icon',
      type: 'select',
      defaultValue: 'explore',
      options: [
        { label: 'Compass (day tours)', value: 'explore' },
        { label: 'Infinity (all-inclusive)', value: 'all-inclusive' },
        { label: 'Bed (hotels)', value: 'hotel' },
        { label: 'Bicycle', value: 'bike' },
        { label: 'Sailing', value: 'sailing' },
      ],
      admin: { description: 'Optional badge shown above the card title.' },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'href',
      type: 'text',
      defaultValue: '/tours',
      admin: { description: 'Locale-agnostic path, e.g. /tours/daily.' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Lower numbers appear first.' },
    },
    slugField(),
  ],
}
