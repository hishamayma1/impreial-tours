import type { GlobalConfig } from 'payload'
import { anyone, isEditor } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'

export const Footer: GlobalConfig = {
  slug: 'footer',
  label: 'Footer',
  admin: { group: 'Site chrome' },
  access: { read: anyone, update: isEditor },
  hooks: { afterChange: [revalidateGlobal('footer')] },
  fields: [
    {
      name: 'blurb',
      type: 'textarea',
      localized: true,
      maxLength: 300,
      admin: { description: 'Falls back to the translated default when left blank.' },
    },
    {
      name: 'columns',
      type: 'array',
      maxRows: 3,
      labels: { singular: 'Column', plural: 'Columns' },
      fields: [
        { name: 'title', type: 'text', required: true, localized: true },
        {
          name: 'links',
          type: 'array',
          fields: [
            { name: 'label', type: 'text', required: true, localized: true },
            { name: 'href', type: 'text', required: true, defaultValue: '/' },
          ],
        },
      ],
    },
  ],
}
