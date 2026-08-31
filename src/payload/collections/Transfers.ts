import type { Field, CollectionConfig } from 'payload'
import { publishedOrStaff, canWriteService, canDeleteService, canPublishService } from '../access'
import { slugField } from '../fields/slug'
import { revalidateCollection, revalidateCollectionOnDelete } from '../hooks/revalidate'

/**
 * Airport zones and intercity routes price the same way — by vehicle class — so the
 * shape is declared once and reused in both branches.
 */
const vehiclePricing: Field = {
  name: 'vehiclePricing',
  type: 'array',
  minRows: 1,
  labels: { singular: 'Vehicle price', plural: 'Vehicle prices' },
  fields: [
    { name: 'vehicleClass', type: 'text', required: true, localized: true },
    { name: 'maxPassengers', type: 'number', required: true, min: 1 },
    { name: 'maxLuggage', type: 'number', min: 0 },
    { name: 'price', type: 'number', required: true, min: 0 },
  ],
}


/**
 * Paid add-ons a customer can attach to a transfer at booking time — the
 * customisations an editor controls from the dashboard.
 *
 * Priced per booking rather than per passenger by default, with a flag for the ones
 * that genuinely scale with the party. The booking route re-reads these by row id and
 * recomputes the total from them, so the price shown on the form is never the price
 * that is charged.
 */
const bookingExtras: Field = {
  name: 'extras',
  type: 'array',
  labels: { singular: 'Extra', plural: 'Extras' },
  admin: {
    initCollapsed: true,
    description: 'Optional add-ons shown as checkboxes on the booking form.',
  },
  fields: [
    { name: 'label', type: 'text', required: true, localized: true },
    { name: 'description', type: 'text', localized: true },
    { name: 'price', type: 'number', required: true, min: 0 },
    {
      name: 'perPassenger',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Multiply the price by the number of passengers.' },
    },
  ],
}

export const Transfers: CollectionConfig = {
  slug: 'transfers',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'transferType', '_status'],
    group: 'Services',
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    read: publishedOrStaff,
    create: canWriteService('transfers'),
    update: canWriteService('transfers'),
    delete: canDeleteService('transfers'),
  },
  hooks: {
    afterChange: [revalidateCollection('transfers')],
    afterDelete: [revalidateCollectionOnDelete('transfers')],
  },
  fields: [
    {
      name: 'transferType',
      type: 'select',
      required: true,
      index: true,
      defaultValue: 'airport',
      admin: { position: 'sidebar' },
      options: [
        { label: 'Airport transfer', value: 'airport' },
        { label: 'City to city', value: 'intercity' },
        { label: 'Custom (quote only)', value: 'custom' },
      ],
    },
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
    { name: 'title', type: 'text', required: true, localized: true },
    slugField({ from: 'title' }),
    { name: 'description', type: 'textarea', localized: true },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },

    // Shared fleet, referenced by both pricing branches.
    {
      name: 'vehicles',
      type: 'array',
      labels: { singular: 'Vehicle', plural: 'Fleet' },
      admin: { initCollapsed: true },
      fields: [
        { name: 'className', type: 'text', required: true, localized: true },
        { name: 'image', type: 'upload', relationTo: 'media' },
        { name: 'maxPassengers', type: 'number', required: true, min: 1 },
        { name: 'maxLuggage', type: 'number', min: 0 },
        {
          name: 'features',
          type: 'array',
          localized: true,
          fields: [{ name: 'text', type: 'text', required: true }],
        },
      ],
    },

    /**
     * Declared once at the document root rather than inside each branch: the two
     * collapsibles are presentational, so a copy in each would be two fields called
     * `extras` on the same document and Payload rejects the duplicate outright.
     * The condition hides it from custom trips, which carry no pricing to add to.
     */
    {
      ...bookingExtras,
      admin: {
        ...bookingExtras.admin,
        condition: (_: unknown, sibling: Record<string, unknown>) =>
          sibling?.transferType === 'airport' || sibling?.transferType === 'intercity',
      },
    },

    // --- Airport --------------------------------------------------------------
    {
      type: 'collapsible',
      label: 'Airport transfer',
      admin: { condition: (_, sibling) => sibling?.transferType === 'airport' },
      fields: [
        {
          name: 'airports',
          type: 'relationship',
          relationTo: 'airports',
          hasMany: true,
          admin: {
            description:
              'The airports this transfer serves. These populate the "From" select on the booking form; add them under Services → Airports.',
          },
        },
        /**
         * The free-text airport this document was authored with, before airports
         * became records of their own. Kept so existing content still reads correctly
         * and no published page loses its heading on deploy; the relationship above is
         * what the booking form uses.
         */
        {
          name: 'airport',
          type: 'text',
          localized: true,
          admin: { description: 'Legacy free-text airport name. Prefer the Airports relationship above.' },
        },
        {
          name: 'direction',
          type: 'select',
          defaultValue: 'roundTrip',
          options: [
            { label: 'Arrival', value: 'arrival' },
            { label: 'Departure', value: 'departure' },
            { label: 'Round trip', value: 'roundTrip' },
          ],
        },
        {
          name: 'zones',
          type: 'array',
          admin: {
            initCollapsed: true,
            description: 'Price bands by area — each hotel or district maps to one zone.',
          },
          fields: [
            { name: 'zoneName', type: 'text', required: true, localized: true },
            {
              /**
               * The predefined drop-off points in this zone.
               *
               * These are what the customer picks from, and the pick is what selects
               * the zone — so a destination that is not listed here has no price, and
               * the form routes it to a quote request instead of inventing one.
               */
              name: 'hotelsOrAreas',
              label: 'Destinations in this zone',
              type: 'array',
              localized: true,
              admin: {
                description:
                  'Hotels, districts or landmarks priced at this zone. Shown to the customer as the "To" options.',
              },
              fields: [{ name: 'text', type: 'text', required: true }],
            },
            vehiclePricing,
          ],
        },
        { name: 'meetAndGreet', type: 'checkbox', defaultValue: true },
        { name: 'freeWaitingMinutes', type: 'number', min: 0, defaultValue: 60 },
      ],
    },

    // --- Intercity ------------------------------------------------------------
    {
      type: 'collapsible',
      label: 'City to city',
      admin: { condition: (_, sibling) => sibling?.transferType === 'intercity' },
      fields: [
        {
          name: 'routes',
          type: 'array',
          admin: { initCollapsed: true },
          fields: [
            { name: 'fromCity', type: 'text', required: true, localized: true },
            { name: 'toCity', type: 'text', required: true, localized: true },
            { name: 'distanceKm', type: 'number', min: 0 },
            { name: 'estimatedDurationMin', type: 'number', min: 0 },
            { name: 'oneWayOnly', type: 'checkbox', defaultValue: false },
            {
              name: 'note',
              type: 'text',
              localized: true,
              admin: {
                description:
                  'Shown under the route on the booking form — a scenic stop, a border formality, anything a traveller should know before choosing it.',
              },
            },
            vehiclePricing,
          ],
        },
      ],
    },

    // --- Custom ---------------------------------------------------------------
    {
      type: 'collapsible',
      label: 'Custom trip',
      admin: { condition: (_, sibling) => sibling?.transferType === 'custom' },
      fields: [
        {
          name: 'customNote',
          type: 'textarea',
          localized: true,
          admin: {
            description:
              'Custom trips carry no pricing — submissions land in Quote Requests for manual quoting. The form itself is switched on by SiteSettings.enableCustomQuote.',
          },
        },
      ],
    },
  ],
}
