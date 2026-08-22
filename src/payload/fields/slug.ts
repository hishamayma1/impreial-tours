import type { Field } from 'payload'
import { formatSlug } from '../hooks/format-slug'

type Options = {
  /** Field the slug is derived from when left blank. */
  from?: string
  /** Localized slugs give each language its own SEO-friendly URL. */
  localized?: boolean
}

export const slugField = ({ from = 'title', localized = true }: Options = {}): Field => ({
  name: 'slug',
  type: 'text',
  index: true,
  unique: !localized,
  localized,
  admin: {
    position: 'sidebar',
    description: 'Leave blank to generate it from the title.',
  },
  hooks: {
    beforeValidate: [formatSlug(from)],
  },
})
