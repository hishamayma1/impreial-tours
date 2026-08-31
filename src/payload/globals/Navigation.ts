import type { GlobalConfig } from 'payload'
import { anyone, isAdminOrManager } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'

/**
 * Spec Section 5. The main nav, with one level of dropdown children.
 *
 * `linkType` keeps authored links honest: a page or collection reference survives a
 * slug rename, whereas a hand-typed URL does not — so custom is the escape hatch,
 * not the default.
 */
const linkFields = [
  { name: 'label', type: 'text' as const, required: true, localized: true },
  {
    name: 'linkType',
    type: 'select' as const,
    defaultValue: 'custom',
    options: [
      { label: 'Page', value: 'page' },
      { label: 'Collection', value: 'collection' },
      { label: 'Custom URL', value: 'custom' },
    ],
  },
  {
    name: 'page',
    type: 'relationship' as const,
    relationTo: 'pages' as const,
    admin: { condition: (_: unknown, sibling: Record<string, unknown>) => sibling?.linkType === 'page' },
  },
  {
    name: 'collectionPath',
    type: 'select' as const,
    admin: {
      condition: (_: unknown, sibling: Record<string, unknown>) => sibling?.linkType === 'collection',
    },
    options: [
      { label: 'All tours', value: '/tours' },
      { label: 'Daily tours', value: '/tours/daily' },
      { label: 'Full experiences', value: '/tours/experiences' },
      { label: 'Hotels', value: '/hotels' },
      { label: 'Transfers', value: '/transfers' },
      { label: 'Airport transfer', value: '/transfers/airport' },
      { label: 'City to city', value: '/transfers/intercity' },
      { label: 'Custom trip', value: '/transfers/custom' },
      { label: 'Bicycles', value: '/bicycles' },
    ],
  },
  {
    name: 'url',
    type: 'text' as const,
    admin: {
      condition: (_: unknown, sibling: Record<string, unknown>) => sibling?.linkType === 'custom',
      description: 'Locale-less path, e.g. /about — the locale prefix is added for you.',
    },
  },
  {
    name: 'service',
    type: 'select' as const,
    admin: {
      description:
        'Optional. When set, this item is hidden if the service is switched off in Site Settings.',
    },
    options: [
      { label: 'Tours', value: 'tours' },
      { label: 'Hotels', value: 'hotels' },
      { label: 'Transfers', value: 'transfers' },
      { label: 'Bicycles', value: 'bicycles' },
    ],
  },
]

export const Navigation: GlobalConfig = {
  slug: 'navigation',
  admin: { group: 'Settings' },
  access: { read: anyone, update: isAdminOrManager },
  hooks: { afterChange: [revalidateGlobal('navigation')] },
  fields: [
    {
      name: 'mainNav',
      type: 'array',
      labels: { singular: 'Nav item', plural: 'Main navigation' },
      admin: { initCollapsed: true },
      fields: [
        ...linkFields,
        {
          name: 'children',
          type: 'array',
          labels: { singular: 'Dropdown item', plural: 'Dropdown items' },
          fields: linkFields,
        },
      ],
    },
    {
      name: 'cta',
      type: 'group',
      fields: linkFields,
    },
  ],
}
