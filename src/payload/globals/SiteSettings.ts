import type { GlobalConfig } from 'payload'
import { anyone, isEditor } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site settings',
  admin: { group: 'Site chrome' },
  access: { read: anyone, update: isEditor },
  hooks: { afterChange: [revalidateGlobal('site-settings')] },
  fields: [
    { name: 'brandName', type: 'text', defaultValue: 'IMPERIAL TOURS' },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    {
      name: 'defaultSeo',
      type: 'group',
      label: 'Default SEO',
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'description', type: 'textarea', localized: true, maxLength: 300 },
        { name: 'ogImage', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'currencies',
      type: 'array',
      labels: { singular: 'Currency', plural: 'Currencies' },
      admin: { description: 'Offered in the header currency switcher. The first row is the default.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'code', type: 'text', required: true, admin: { width: '33%' } },
            { name: 'symbol', type: 'text', required: true, admin: { width: '33%' } },
            {
              name: 'rate',
              type: 'number',
              required: true,
              defaultValue: 1,
              admin: { width: '34%', description: 'Multiplier applied to base (USD) prices.' },
            },
          ],
        },
      ],
    },
  ],
}
