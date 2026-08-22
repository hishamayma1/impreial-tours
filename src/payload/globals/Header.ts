import type { GlobalConfig } from 'payload'
import { anyone, isEditor } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'

export const Header: GlobalConfig = {
  slug: 'header',
  label: 'Header',
  admin: { group: 'Site chrome' },
  access: { read: anyone, update: isEditor },
  hooks: { afterChange: [revalidateGlobal('header')] },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      maxRows: 8,
      labels: { singular: 'Nav item', plural: 'Nav items' },
      fields: [
        { name: 'label', type: 'text', required: true, localized: true },
        {
          name: 'href',
          type: 'text',
          required: true,
          defaultValue: '/',
          admin: { description: 'Locale-agnostic path. The language prefix is added for you.' },
        },
      ],
    },
    {
      name: 'cta',
      type: 'group',
      label: 'Primary call to action',
      fields: [
        { name: 'label', type: 'text', localized: true },
        { name: 'href', type: 'text', defaultValue: '/booking' },
      ],
    },
  ],
}
