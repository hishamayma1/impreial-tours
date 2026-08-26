import type { CollectionConfig } from 'payload'
import {
  publishedOrStaff,
  canWriteService,
  canDeleteService,
  canPublishService,
} from '../access'
import { slugField } from '../fields/slug'
import { revalidateCollection, revalidateCollectionOnDelete } from '../hooks/revalidate'

const isDaily = (_: unknown, siblingData: Record<string, unknown>) =>
  siblingData?.tourType === 'daily'
const isExperience = (_: unknown, siblingData: Record<string, unknown>) =>
  siblingData?.tourType === 'experience'

/**
 * One collection serves both daily tours and multi-day experiences, discriminated by
 * `tourType`. Shared fields (destination, gallery, inclusions) are declared once, and
 * `admin.condition` hides the half that does not apply, so the editing UX stays as
 * clean as two separate collections while queries, cards and "all tours" listings
 * stay single-source.
 */
export const Tours: CollectionConfig = {
  slug: 'tours',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'tourType', 'destination', 'rating', '_status'],
    group: 'Services',
    listSearchableFields: ['title', 'shortDescription'],
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    read: publishedOrStaff,
    create: canWriteService('tours'),
    update: canWriteService('tours'),
    delete: canDeleteService('tours'),
  },
  hooks: {
    afterChange: [revalidateCollection('tours')],
    afterDelete: [revalidateCollectionOnDelete('tours')],
  },
  fields: [
    {
      name: 'tourType',
      type: 'select',
      required: true,
      index: true,
      defaultValue: 'daily',
      admin: {
        position: 'sidebar',
        description: 'Drives which fields appear below, and which listing the tour joins.',
      },
      options: [
        { label: 'Daily Tour', value: 'daily' },
        { label: 'Full Experience', value: 'experience' },
      ],
    },
    // Editors may draft but not publish — Section 4's approval workflow.
    {
      name: '_status',
      type: 'select',
      access: { update: canPublishService('tours') },
      admin: { hidden: true },
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },

    // --- Shared ---------------------------------------------------------------
    { name: 'title', type: 'text', required: true, localized: true },
    slugField({ from: 'title' }),
    {
      name: 'destination',
      type: 'relationship',
      relationTo: 'destinations',
      index: true,
      admin: { position: 'sidebar' },
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
    {
      name: 'shortDescription',
      type: 'textarea',
      required: true,
      localized: true,
      maxLength: 300,
      admin: { description: 'Shown on cards and in search results.' },
    },
    { name: 'overview', type: 'richText', required: true, localized: true },
    {
      name: 'highlights',
      type: 'array',
      localized: true,
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'included',
      type: 'array',
      localized: true,
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'notIncluded',
      type: 'array',
      localized: true,
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    { name: 'meetingPoint', type: 'text', required: true, localized: true },
    {
      name: 'languages',
      type: 'select',
      hasMany: true,
      defaultValue: ['en'],
      admin: { description: 'Languages this tour is guided in.' },
      options: [
        { label: 'English', value: 'en' },
        { label: 'Español', value: 'es' },
        { label: 'Deutsch', value: 'de' },
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
    { name: 'groupSizeMax', type: 'number', min: 1 },
    { name: 'rating', type: 'number', min: 0, max: 5, admin: { step: 0.1 } },
    {
      name: 'badge',
      type: 'select',
      defaultValue: 'none',
      admin: { position: 'sidebar' },
      options: [
        { label: 'None', value: 'none' },
        { label: 'Bestseller', value: 'bestseller' },
        { label: 'New', value: 'new' },
      ],
    },

    /**
     * The home page's Limited-Edition Offers carousel is driven from here.
     *
     * An offer is a property of the tour it discounts, not a document of its own:
     * that way the carousel slide and the page it sends you to can never describe
     * different things, and the "Discover" button lands on a real, bookable tour
     * instead of a marketing URL with no page behind it.
     */
    {
      name: 'offer',
      type: 'group',
      label: 'Home page offer',
      admin: {
        position: 'sidebar',
        description: 'Feature this tour in the offers carousel on the home page.',
      },
      fields: [
        {
          name: 'active',
          type: 'checkbox',
          defaultValue: false,
          label: 'Show in the offers carousel',
        },
        {
          name: 'label',
          type: 'text',
          localized: true,
          admin: {
            condition: (_data, siblingData) => Boolean(siblingData?.active),
            description: 'Badge shown on the slide, e.g. "Save 20%" or "Limited dates".',
          },
        },
        {
          name: 'activeFrom',
          type: 'date',
          admin: {
            condition: (_data, siblingData) => Boolean(siblingData?.active),
            description: 'Optional. Leave blank to start immediately.',
          },
        },
        {
          name: 'activeUntil',
          type: 'date',
          admin: {
            condition: (_data, siblingData) => Boolean(siblingData?.active),
            description: 'Optional. Leave blank to run until switched off.',
          },
        },
      ],
    },

    // --- Daily only -----------------------------------------------------------
    {
      type: 'collapsible',
      label: 'Daily tour details',
      admin: { condition: isDaily },
      fields: [
        { name: 'durationHours', type: 'number', min: 0.5, admin: { step: 0.5 } },
        {
          name: 'startTimes',
          type: 'array',
          labels: { singular: 'Start time', plural: 'Start times' },
          fields: [
            {
              name: 'time',
              type: 'text',
              required: true,
              admin: { placeholder: '08:00' },
            },
          ],
        },
        {
          name: 'availableWeekdays',
          type: 'select',
          hasMany: true,
          options: [
            { label: 'Monday', value: 'mon' },
            { label: 'Tuesday', value: 'tue' },
            { label: 'Wednesday', value: 'wed' },
            { label: 'Thursday', value: 'thu' },
            { label: 'Friday', value: 'fri' },
            { label: 'Saturday', value: 'sat' },
            { label: 'Sunday', value: 'sun' },
          ],
        },
        { name: 'pricePerPerson', type: 'number', min: 0 },
        { name: 'childPrice', type: 'number', min: 0 },
        {
          name: 'privateGroupPrice',
          type: 'number',
          min: 0,
          admin: { description: 'Flat price to book the whole tour privately. Optional.' },
        },
        { name: 'instantConfirmation', type: 'checkbox', defaultValue: true },
      ],
    },

    // --- Experience only ------------------------------------------------------
    {
      type: 'collapsible',
      label: 'Full experience details',
      admin: { condition: isExperience },
      fields: [
        { name: 'durationDays', type: 'number', min: 1 },
        { name: 'nights', type: 'number', min: 0 },
        {
          name: 'itinerary',
          type: 'array',
          labels: { singular: 'Day', plural: 'Days' },
          admin: { initCollapsed: true },
          fields: [
            { name: 'dayNumber', type: 'number', required: true, min: 1 },
            { name: 'dayTitle', type: 'text', required: true, localized: true },
            { name: 'dayDescription', type: 'textarea', required: true, localized: true },
            {
              name: 'meals',
              type: 'select',
              hasMany: true,
              options: [
                { label: 'Breakfast', value: 'breakfast' },
                { label: 'Lunch', value: 'lunch' },
                { label: 'Dinner', value: 'dinner' },
              ],
            },
            { name: 'accommodation', type: 'text', localized: true },
            { name: 'image', type: 'upload', relationTo: 'media' },
          ],
        },
        { name: 'accommodationIncluded', type: 'checkbox', defaultValue: true },
        {
          name: 'pricing',
          type: 'group',
          fields: [
            { name: 'basePricePerPerson', type: 'number', min: 0 },
            {
              name: 'singleSupplement',
              type: 'number',
              min: 0,
              admin: { description: 'Added once for a traveller who will not share a room.' },
            },
            {
              name: 'priceTiers',
              type: 'array',
              admin: {
                description:
                  'Per-person price by group size — larger groups pay less per head. Tiers must not overlap.',
              },
              fields: [
                { name: 'minPax', type: 'number', required: true, min: 1 },
                { name: 'maxPax', type: 'number', required: true, min: 1 },
                { name: 'pricePerPerson', type: 'number', required: true, min: 0 },
              ],
            },
          ],
        },
        {
          name: 'departureDates',
          type: 'array',
          admin: { initCollapsed: true },
          fields: [
            { name: 'date', type: 'date', required: true, index: true },
            { name: 'capacity', type: 'number', min: 0 },
            {
              name: 'priceOverride',
              type: 'number',
              min: 0,
              admin: { description: 'Replaces the tier price for this departure only.' },
            },
          ],
        },
      ],
    },
  ],
}
