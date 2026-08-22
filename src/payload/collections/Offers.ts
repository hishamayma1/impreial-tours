import type { CollectionConfig } from 'payload'
import { isEditor, publishedOrEditor } from '../access'
import { slugField } from '../fields/slug'
import { revalidateCollection, revalidateCollectionOnDelete } from '../hooks/revalidate'

/** Slides of the "Limited-Edition Offers" carousel. */
export const Offers: CollectionConfig = {
  slug: 'offers',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'order', 'activeFrom', 'activeUntil', '_status'],
    group: 'Content',
    description: 'Seasonal, time-boxed journeys shown in the homepage carousel.',
  },
  versions: { drafts: true },
  defaultSort: 'order',
  access: { read: publishedOrEditor, create: isEditor, update: isEditor, delete: isEditor },
  hooks: {
    afterChange: [revalidateCollection('offers')],
    afterDelete: [revalidateCollectionOnDelete('offers')],
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: { description: '16:9 crop. The slide overlays a navy gradient from the left.' },
    },
    {
      name: 'badges',
      type: 'array',
      localized: true,
      maxRows: 3,
      labels: { singular: 'Badge', plural: 'Badges' },
      fields: [
        { name: 'text', type: 'text', required: true },
        {
          name: 'tone',
          type: 'radio',
          defaultValue: 'glass',
          options: [
            { label: 'Glass (translucent)', value: 'glass' },
            { label: 'Solid navy', value: 'solid' },
          ],
        },
      ],
    },
    {
      name: 'href',
      type: 'text',
      required: true,
      defaultValue: '/offers',
      admin: { description: 'Locale-agnostic path for the offer details button.' },
    },
    {
      type: 'row',
      fields: [
        { name: 'activeFrom', type: 'date', admin: { width: '50%' } },
        { name: 'activeUntil', type: 'date', admin: { width: '50%' } },
      ],
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
