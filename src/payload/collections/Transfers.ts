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

    // --- Airport --------------------------------------------------------------
    {
      type: 'collapsible',
      label: 'Airport transfer',
      admin: { condition: (_, sibling) => sibling?.transferType === 'airport' },
      fields: [
        { name: 'airport', type: 'text', localized: true },
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
              name: 'hotelsOrAreas',
              type: 'array',
              localized: true,
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
