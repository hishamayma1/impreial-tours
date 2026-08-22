import type { CollectionConfig } from 'payload'
import { publishedOrStaff, canWriteService, canDeleteService, canPublishService } from '../access'
import { slugField } from '../fields/slug'
import { revalidateCollection, revalidateCollectionOnDelete } from '../hooks/revalidate'

const isRental = (_: unknown, sibling: Record<string, unknown>) => sibling?.bikeType === 'rental'
const isTour = (_: unknown, sibling: Record<string, unknown>) => sibling?.bikeType === 'tour'

/**
 * Two products in one collection: time-based rentals (priced by duration band) and
 * guided rides (priced per person). `bikeType` decides which half of the form shows.
 */
export const Bicycles: CollectionConfig = {
  slug: 'bicycles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'bikeType', 'difficulty', '_status'],
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
          ],
        },
        {
          name: 'rentalPricing',
          type: 'array',
          minRows: 1,
          admin: {
            description:
              'Duration bands, cheapest per hour as the window grows. durationHours drives the checkout maths; durationLabel is what the customer reads.',
          },
          fields: [
            { name: 'durationLabel', type: 'text', required: true, localized: true },
            { name: 'durationHours', type: 'number', required: true, min: 0.5 },
            { name: 'price', type: 'number', required: true, min: 0 },
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
