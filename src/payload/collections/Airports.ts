import type { CollectionConfig } from 'payload'

import { publishedOrStaff, canWriteService, canDeleteService, canPublishService } from '../access'
import { slugField } from '../fields/slug'
import { revalidateCollection, revalidateCollectionOnDelete } from '../hooks/revalidate'

/**
 * The airports an airport transfer can start from or return to.
 *
 * A collection rather than an array on the Transfer document, because an airport is a
 * real-world thing with an identity that outlives any one price list: the same
 * "Cairo International (CAI)" is referenced by the arrival transfer, the departure
 * transfer and — in time — by anything else that needs to name it. Kept as an array,
 * every one of those would hold its own spelling of the name, and the customer-facing
 * select would eventually disagree with itself.
 *
 * Access mirrors Transfers: whoever may edit the transfers service may edit the
 * airports it departs from, and publishing stays behind the same approval gate.
 */
export const Airports: CollectionConfig = {
  slug: 'airports',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'code', 'city', 'order', '_status'],
    group: 'Services',
    description: 'Airports offered as the pick-up or drop-off point of an airport transfer.',
  },
  versions: { drafts: true },
  defaultSort: 'order',
  access: {
    read: publishedOrStaff,
    create: canWriteService('transfers'),
    update: canWriteService('transfers'),
    delete: canDeleteService('transfers'),
  },
  hooks: {
    afterChange: [revalidateCollection('airports')],
    afterDelete: [revalidateCollectionOnDelete('airports')],
  },
  fields: [
    {
      name: '_status',
      type: 'select',
      access: { update: canPublishService('transfers') },
      admin: { hidden: true },
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
    { name: 'name', type: 'text', required: true, localized: true },
    {
      name: 'code',
      type: 'text',
      required: true,
      index: true,
      maxLength: 4,
      admin: {
        description: 'IATA code, e.g. CAI. Shown beside the name so two airports serving the same city stay distinguishable.',
      },
      /**
       * Uppercased on save rather than validated into rejection. An editor typing
       * "cai" means CAI, and refusing the save teaches them nothing a `toUpperCase`
       * could not have done silently.
       */
      hooks: {
        beforeChange: [({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)],
      },
    },
    // Not localized: a slug is a URL fragment and a stable identity, and a per-locale
    // one would give the same airport three of them.
    slugField({ from: 'code' }),
    { name: 'city', type: 'text', localized: true },
    {
      name: 'terminals',
      type: 'array',
      labels: { singular: 'Terminal', plural: 'Terminals' },
      admin: {
        description:
          'Optional. Listed on the booking form so a traveller can say which terminal to meet at.',
      },
      fields: [{ name: 'name', type: 'text', required: true, localized: true }],
    },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
