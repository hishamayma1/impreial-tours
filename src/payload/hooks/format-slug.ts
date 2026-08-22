import type { FieldHook } from 'payload'

export const slugify = (value: string): string =>
  value
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** Derives the slug from `sourceField` whenever the editor leaves it blank. */
export const formatSlug =
  (sourceField: string): FieldHook =>
  ({ data, operation, value }) => {
    if (typeof value === 'string' && value.length > 0) return slugify(value)

    if (operation === 'create' || operation === 'update') {
      const source = data?.[sourceField]
      if (typeof source === 'string' && source.length > 0) return slugify(source)
    }

    return value
  }
