import type { Field } from 'payload'

/**
 * A single navigation/CTA link. `type` lets an editor point either at an internal
 * route (kept locale-agnostic — the front end prefixes it) or an absolute URL.
 */
export const linkField = (overrides: Partial<Field> = {}): Field =>
  ({
    name: 'link',
    type: 'group',
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'label',
            type: 'text',
            required: true,
            localized: true,
            admin: { width: '50%' },
          },
          {
            name: 'type',
            type: 'radio',
            defaultValue: 'internal',
            options: [
              { label: 'Internal path', value: 'internal' },
              { label: 'External URL', value: 'external' },
            ],
            admin: { width: '50%' },
          },
        ],
      },
      {
        name: 'href',
        type: 'text',
        required: true,
        defaultValue: '/',
        admin: {
          description: 'Internal paths start with "/" and must not include the language prefix.',
        },
      },
      {
        name: 'newTab',
        type: 'checkbox',
        label: 'Open in a new tab',
        defaultValue: false,
      },
    ],
    ...overrides,
  }) as Field
