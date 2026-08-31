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
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'contactEmail', type: 'email' },
        { name: 'phone', type: 'text' },
        {
          name: 'whatsappNumber',
          type: 'text',
          admin: {
            description:
              'International format, digits only, no + or spaces (e.g. 201234567890). Used to build the wa.me deep link for custom quotes.',
          },
        },
        { name: 'address', type: 'textarea', localized: true },
        { name: 'businessHours', type: 'text', localized: true },
      ],
    },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        { name: 'platform', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
    {
      name: 'enabledServices',
      type: 'select',
      hasMany: true,
      defaultValue: ['tours', 'hotels', 'transfers', 'bicycles'],
      admin: {
        description: 'Switching a service off hides its navigation entries site-wide.',
      },
      options: [
        { label: 'Tours', value: 'tours' },
        { label: 'Hotels', value: 'hotels' },
        { label: 'Transfers', value: 'transfers' },
        { label: 'Bicycles', value: 'bicycles' },
      ],
    },
    {
      name: 'enableCustomQuote',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Shows the custom-trip form at /transfers/custom.' },
    },
    { name: 'defaultCurrency', type: 'text', defaultValue: 'USD' },
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
      /**
       * Capped at the two currencies this operator actually trades in.
       *
       * `code` was free text, so the switcher offered whatever had been typed into it
       * — and a code that is not a real ISO 4217 currency silently breaks
       * `Intl.NumberFormat`, which is what formats every price on the site. A select
       * of the two supported codes makes the offer deliberate rather than incidental,
       * and `maxRows` stops a third being added by accident.
       */
      maxRows: 2,
      admin: {
        description:
          'Offered in the header currency switcher. The first row is the default and should be USD, which is the currency every price is authored in.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'code',
              type: 'select',
              required: true,
              admin: { width: '33%' },
              options: [
                { label: 'US Dollar (USD)', value: 'USD' },
                { label: 'Egyptian Pound (EGP)', value: 'EGP' },
              ],
            },
            { name: 'symbol', type: 'text', required: true, admin: { width: '33%' } },
            {
              name: 'rate',
              type: 'number',
              required: true,
              defaultValue: 1,
              admin: {
                width: '34%',
                description: 'Multiplier applied to base (USD) prices. USD is the base, so its rate is 1.',
              },
            },
          ],
        },
      ],
    },
  ],
}
