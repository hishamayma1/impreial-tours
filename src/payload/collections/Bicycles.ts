import type { CollectionConfig } from 'payload'
import { publishedOrStaff, canWriteService, canDeleteService, canPublishService } from '../access'
import { slugField } from '../fields/slug'
import { revalidateCollection, revalidateCollectionOnDelete } from '../hooks/revalidate'

const isRental = (_: unknown, sibling: Record<string, unknown>) => sibling?.bikeType === 'rental'
const isTour = (_: unknown, sibling: Record<string, unknown>) => sibling?.bikeType === 'tour'

/** The hourly half of the form only matters when the mode actually charges by the hour. */
const chargesByHour = (_: unknown, sibling: Record<string, unknown>) =>
  sibling?.bikeType === 'rental' && sibling?.pricingMode !== 'bands'

const positive = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null

/**
 * Two products in one collection: time-based rentals (priced by duration package
 * and/or by the hour) and guided rides (priced per person). `bikeType` decides which
 * half of the form shows.
 */
export const Bicycles: CollectionConfig = {
  slug: 'bicycles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'bikeType', 'category', 'priceFrom', '_status'],
    group: 'Services',
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    read: publishedOrStaff,
    create: canWriteService('bicycles'),
    update: canWriteService('bicycles'),
    delete: canDeleteService('bicycles'),
  },
  hooks: {
    afterChange: [revalidateCollection('bicycles')],
    afterDelete: [revalidateCollectionOnDelete('bicycles')],
  },
  fields: [
    {
      name: 'bikeType',
      type: 'select',
      required: true,
      index: true,
      defaultValue: 'rental',
      admin: { position: 'sidebar' },
      options: [
        { label: 'Rental', value: 'rental' },
        { label: 'Guided tour', value: 'tour' },
      ],
    },
    /**
     * What kind of bike this is, in the visitor's terms rather than the workshop's.
     * Indexed because it is the first facet on the listing rail, so nearly every
     * filtered view narrows on it before anything else.
     */
    {
      name: 'category',
      type: 'select',
      index: true,
      defaultValue: 'city',
      admin: { position: 'sidebar' },
      options: [
        { label: 'City', value: 'city' },
        { label: 'Electric', value: 'electric' },
        { label: 'Mountain', value: 'mountain' },
        { label: 'Road', value: 'road' },
        { label: 'Touring', value: 'touring' },
        { label: 'Kids', value: 'kids' },
      ],
    },
    {
      name: 'destination',
      type: 'relationship',
      relationTo: 'destinations',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Where the bike is picked up, or where the ride starts.',
      },
    },
    {
      name: '_status',
      type: 'select',
      access: { update: canPublishService('bicycles') },
      admin: { hidden: true },
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
    /**
     * The cheapest way onto this bike, denormalised on save.
     *
     * A rental has no single price — it has an hourly rate and a ladder of duration
     * packages — so there was nothing for the database to sort or filter on, and a
     * price control on the listing would have had nothing to compare against. Mirrors
     * `hotels.priceFrom`: indexed, derived, never authored.
     */
    {
      name: 'priceFrom',
      type: 'number',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Cheapest entry price, derived on save. Sorts and filters the listing.',
      },
      hooks: {
        beforeChange: [
          ({ data }) => {
            if (data?.bikeType === 'tour') return positive(data?.pricePerPerson)

            const packages = (data?.rentalPricing ?? []) as Array<Record<string, unknown>>
            const candidates = [
              ...packages.map((band) => positive(band?.price)),
              // The hourly rate is only a real entry price when the mode offers it.
              data?.pricingMode === 'bands' ? null : positive(data?.hourlyRate),
            ].filter((value): value is number => value !== null)

            return candidates.length ? Math.min(...candidates) : null
          },
        ],
      },
    },
    { name: 'title', type: 'text', required: true, localized: true },
    slugField({ from: 'title' }),
    { name: 'image', type: 'upload', relationTo: 'media' },
    {
      name: 'gallery',
      type: 'array',
      fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
    },
    { name: 'description', type: 'textarea', localized: true },

    // --- Rental ---------------------------------------------------------------
    {
      type: 'collapsible',
      label: 'Rental details',
      admin: { condition: isRental },
      fields: [
        { name: 'bikeModel', type: 'text', localized: true },
        {
          name: 'specs',
          type: 'group',
          fields: [
            { name: 'frameSize', type: 'text' },
            { name: 'gears', type: 'number', min: 0 },
            { name: 'electric', type: 'checkbox', defaultValue: false },
            { name: 'weightKg', type: 'number', min: 0 },
            {
              name: 'frameSizes',
              type: 'select',
              hasMany: true,
              options: ['XS', 'S', 'M', 'L', 'XL'].map((size) => ({ label: size, value: size })),
              admin: { description: 'Sizes kept in stock, offered at handover.' },
            },
          ],
        },
        { name: 'deposit', type: 'number', min: 0 },
        {
          name: 'includedAccessories',
          type: 'array',
          localized: true,
          fields: [{ name: 'text', type: 'text', required: true }],
        },
        { name: 'inventory', type: 'number', min: 0, defaultValue: 0 },
      ],
    },

    // --- Rental pricing by time -----------------------------------------------
    /**
     * The whole time-pricing model, editable per bike from the dashboard.
     *
     * Two ways to charge, and the planner quotes whichever is cheaper for the duration
     * asked for — see `quoteRental` in lib/rental-pricing.ts. Keeping both behind one
     * mode switch is what lets an editor run "hourly only" on a workhorse city bike and
     * "packages only" on a premium one without a second collection or a code change.
     */
    {
      type: 'collapsible',
      label: 'Rental pricing by time',
      admin: {
        condition: isRental,
        description:
          'How this bike is charged by duration. Drives the rental planner on the public page.',
      },
      fields: [
        {
          name: 'pricingMode',
          type: 'select',
          defaultValue: 'both',
          options: [
            { label: 'Hourly rate + duration packages', value: 'both' },
            { label: 'Duration packages only', value: 'bands' },
            { label: 'Hourly rate only', value: 'hourly' },
          ],
        },
        {
          type: 'row',
          admin: { condition: chargesByHour },
          fields: [
            {
              name: 'hourlyRate',
              type: 'number',
              min: 0,
              admin: { width: '50%', description: 'Price for one hour, in USD.' },
            },
            {
              name: 'extraHourRate',
              type: 'number',
              min: 0,
              admin: {
                width: '50%',
                description:
                  'Per hour beyond the longest package. Falls back to the hourly rate when empty.',
              },
            },
          ],
        },
        {
          type: 'row',
          admin: { condition: isRental },
          fields: [
            {
              name: 'minHours',
              type: 'number',
              min: 0.5,
              defaultValue: 1,
              admin: { width: '33%', description: 'Shortest rental accepted.' },
            },
            {
              name: 'maxHours',
              type: 'number',
              min: 1,
              defaultValue: 24,
              admin: { width: '33%', description: 'Longest the planner will quote.' },
            },
            {
              name: 'hourStep',
              type: 'number',
              min: 0.5,
              defaultValue: 1,
              admin: {
                width: '34%',
                description: 'Increment the planner moves in — 0.5 for half hours.',
              },
            },
          ],
        },
        {
          name: 'rentalPricing',
          type: 'array',
          labels: { singular: 'Package', plural: 'Packages' },
          admin: {
            condition: (_, sibling) => sibling?.pricingMode !== 'hourly',
            description:
              'Duration packages, cheapest per hour as the window grows. durationHours drives the checkout maths; durationLabel is what the customer reads.',
          },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'durationLabel',
                  type: 'text',
                  required: true,
                  localized: true,
                  admin: { width: '50%' },
                },
                {
                  name: 'durationHours',
                  type: 'number',
                  required: true,
                  min: 0.5,
                  admin: { width: '25%' },
                },
                { name: 'price', type: 'number', required: true, min: 0, admin: { width: '25%' } },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'popular',
                  type: 'checkbox',
                  defaultValue: false,
                  admin: { width: '50%', description: 'Highlighted in the planner.' },
                },
                {
                  name: 'note',
                  type: 'text',
                  localized: true,
                  admin: {
                    width: '50%',
                    description: 'Small print under the package, e.g. "Best value".',
                  },
                },
              ],
            },
          ],
        },
        {
          name: 'pickupSlots',
          type: 'array',
          labels: { singular: 'Pickup time', plural: 'Pickup times' },
          admin: {
            condition: isRental,
            description: 'Handover times offered in the planner, 24h clock. Empty means any time.',
          },
          fields: [{ name: 'time', type: 'text', required: true }],
        },
        {
          type: 'row',
          admin: { condition: isRental },
          fields: [
            {
              name: 'deliveryFee',
              type: 'number',
              min: 0,
              admin: {
                width: '50%',
                description: 'Flat fee to bring the bike to the hotel. Empty hides the option.',
              },
            },
            {
              name: 'weekendSurchargePct',
              type: 'number',
              min: 0,
              max: 100,
              admin: {
                width: '50%',
                description: 'Percentage added to Friday and Saturday rentals.',
              },
            },
          ],
        },
      ],
    },

    // --- Guided tour ----------------------------------------------------------
    {
      type: 'collapsible',
      label: 'Guided tour details',
      admin: { condition: isTour },
      fields: [
        { name: 'routeName', type: 'text', localized: true },
        {
          type: 'row',
          fields: [
            { name: 'distanceKm', type: 'number', min: 0, admin: { width: '50%' } },
            { name: 'elevationGainM', type: 'number', min: 0, admin: { width: '50%' } },
          ],
        },
        {
          name: 'difficulty',
          type: 'select',
          index: true,
          defaultValue: 'easy',
          options: [
            { label: 'Easy', value: 'easy' },
            { label: 'Moderate', value: 'moderate' },
            { label: 'Hard', value: 'hard' },
          ],
        },
        { name: 'durationHours', type: 'number', min: 0.5 },
        {
          name: 'routeMap',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Route image or GPX file.' },
        },
        {
          name: 'routePlan',
          type: 'array',
          labels: { singular: 'Stop', plural: 'Stops' },
          admin: { initCollapsed: true },
          fields: [
            { name: 'stopName', type: 'text', required: true, localized: true },
            { name: 'stopDescription', type: 'textarea', localized: true },
            { name: 'distanceFromStartKm', type: 'number', min: 0 },
            { name: 'image', type: 'upload', relationTo: 'media' },
          ],
        },
        { name: 'pricePerPerson', type: 'number', min: 0 },
        { name: 'minAge', type: 'number', min: 0 },
        { name: 'guideIncluded', type: 'checkbox', defaultValue: true },
        { name: 'bikeIncluded', type: 'checkbox', defaultValue: true },
        {
          name: 'startTimes',
          type: 'array',
          fields: [{ name: 'time', type: 'text', required: true }],
        },
        { name: 'maxGroupSize', type: 'number', min: 1 },
      ],
    },
  ],
}
