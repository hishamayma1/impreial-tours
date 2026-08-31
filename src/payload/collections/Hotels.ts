import type { CollectionConfig } from 'payload'
import { publishedOrStaff, canWriteService, canDeleteService, canPublishService } from '../access'
import { slugField } from '../fields/slug'
import { revalidateCollection, revalidateCollectionOnDelete } from '../hooks/revalidate'

export const Hotels: CollectionConfig = {
  slug: 'hotels',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'destination', 'starRating', '_status'],
    group: 'Services',
    listSearchableFields: ['name', 'address'],
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    read: publishedOrStaff,
    create: canWriteService('hotels'),
    update: canWriteService('hotels'),
    delete: canDeleteService('hotels'),
  },
  hooks: {
    afterChange: [revalidateCollection('hotels')],
    afterDelete: [revalidateCollectionOnDelete('hotels')],
  },
  fields: [
    {
      name: '_status',
      type: 'select',
      access: { update: canPublishService('hotels') },
      admin: { hidden: true },
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
    { name: 'name', type: 'text', required: true, localized: true },
    slugField({ from: 'name' }),
    {
      name: 'destination',
      type: 'relationship',
      relationTo: 'destinations',
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'starRating',
      type: 'number',
      min: 1,
      max: 5,
      admin: { position: 'sidebar', step: 1 },
    },
    /**
     * The cheapest per-person rate across every room and occupancy, denormalised.
     *
     * A hotel has no single price — it has a room list, each room with up to three
     * occupancy rates — so there was nothing for the database to filter or sort on.
     * The listing offered a price range and two price sorts anyway, and `getHotels`
     * quietly ignored all three: the control moved, the URL changed, the results did
     * not. This field is what makes them mean something.
     *
     * Written on save and indexed, mirroring `tours.priceFrom`. Read-only in the
     * admin because it is derived, never authored.
     */
    {
      name: 'priceFrom',
      type: 'number',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Cheapest room rate, derived on save. Sorts and filters the hotels listing.',
      },
      hooks: {
        beforeChange: [
          ({ data }) => {
            const rooms = (data?.roomTypes ?? []) as Array<Record<string, any>>
            const rates = rooms
              .flatMap((room) => [
                room?.pricing?.singlePrice,
                room?.pricing?.doublePrice,
                room?.pricing?.triplePrice,
              ])
              .filter((rate): rate is number => typeof rate === 'number' && Number.isFinite(rate) && rate > 0)

            return rates.length ? Math.min(...rates) : null
          },
        ],
      },
    },
    { name: 'heroImage', type: 'upload', relationTo: 'media', required: true },
    {
      name: 'gallery',
      type: 'array',
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'caption', type: 'text', localized: true },
      ],
    },
    { name: 'description', type: 'richText', required: true, localized: true },
    { name: 'address', type: 'textarea', localized: true },
    { name: 'coordinates', type: 'point' },
    {
      type: 'row',
      fields: [
        { name: 'checkInTime', type: 'text', defaultValue: '14:00', admin: { width: '50%' } },
        { name: 'checkOutTime', type: 'text', defaultValue: '12:00', admin: { width: '50%' } },
      ],
    },
    {
      name: 'amenities',
      type: 'select',
      hasMany: true,
      admin: {
        description:
          'Stored as stable keys; the front end renders the localized label from messages/*.json so amenity names translate without re-tagging every hotel.',
      },
      options: [
        { label: 'Wi-Fi', value: 'wifi' },
        { label: 'Pool', value: 'pool' },
        { label: 'Spa', value: 'spa' },
        { label: 'Parking', value: 'parking' },
        { label: 'Breakfast', value: 'breakfast' },
        { label: 'Gym', value: 'gym' },
        { label: 'Air conditioning', value: 'ac' },
        { label: 'Restaurant', value: 'restaurant' },
        { label: 'Airport shuttle', value: 'airportShuttle' },
        { label: 'Pet friendly', value: 'petFriendly' },
      ],
    },
    { name: 'policies', type: 'richText', localized: true },

    /**
     * The pricing core. Every price here is PER PERSON, PER NIGHT, in the base
     * currency — `doublePrice` is what ONE guest pays when two share the room, not
     * the room rate. lib/pricing.ts multiplies by guests, nights and the season
     * multiplier; see calculateHotelTotal.
     */
    {
      name: 'roomTypes',
      type: 'array',
      minRows: 1,
      labels: { singular: 'Room type', plural: 'Room types' },
      admin: { initCollapsed: true },
      fields: [
        { name: 'roomName', type: 'text', required: true, localized: true },
        {
          name: 'roomImages',
          type: 'array',
          fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
        },
        { name: 'roomDescription', type: 'textarea', localized: true },
        { name: 'maxOccupancy', type: 'number', required: true, min: 1, defaultValue: 2 },
        { name: 'bedConfiguration', type: 'text', localized: true },
        {
          name: 'pricing',
          type: 'group',
          admin: { description: 'Per person, per night, in the base currency.' },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'singlePrice',
                  type: 'number',
                  min: 0,
                  admin: { width: '33%', description: 'One guest alone in the room.' },
                },
                {
                  name: 'doublePrice',
                  type: 'number',
                  min: 0,
                  admin: { width: '33%', description: 'Per person when two share.' },
                },
                {
                  name: 'triplePrice',
                  type: 'number',
                  min: 0,
                  admin: { width: '33%', description: 'Per person when three share.' },
                },
              ],
            },
          ],
        },
        { name: 'extraBedPrice', type: 'number', min: 0 },
        { name: 'breakfastIncluded', type: 'checkbox', defaultValue: true },
        { name: 'refundable', type: 'checkbox', defaultValue: true },
        {
          name: 'inventory',
          type: 'number',
          min: 0,
          defaultValue: 0,
          admin: { description: 'Rooms of this type available to sell.' },
        },
      ],
    },

    {
      name: 'seasonalRates',
      type: 'array',
      admin: {
        initCollapsed: true,
        description:
          'A multiplier applied on top of the base room price for stays in this window. 1.25 = +25%.',
      },
      fields: [
        { name: 'label', type: 'text', required: true, localized: true },
        {
          type: 'row',
          fields: [
            { name: 'startDate', type: 'date', required: true, admin: { width: '50%' } },
            { name: 'endDate', type: 'date', required: true, admin: { width: '50%' } },
          ],
        },
        {
          name: 'multiplier',
          type: 'number',
          required: true,
          min: 0,
          defaultValue: 1,
          admin: { step: 0.05 },
        },
      ],
    },
  ],
}
