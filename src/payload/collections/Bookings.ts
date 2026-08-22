import type { CollectionConfig } from 'payload'
import { anyone, isAdmin, isEditor } from '../access'

/**
 * Captures hero-search enquiries and booking requests. Public create, staff-only read.
 * This is the operational half of the dashboard.
 */
export const Bookings: CollectionConfig = {
  slug: 'bookings',
  labels: { singular: 'Booking enquiry', plural: 'Booking enquiries' },
  admin: {
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'destination', 'tourType', 'travelDate', 'status', 'createdAt'],
    group: 'Operations',
  },
  defaultSort: '-createdAt',
  access: { create: anyone, read: isEditor, update: isEditor, delete: isAdmin },
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === 'create' && !data.reference) {
          const stamp = Date.now().toString(36).toUpperCase()
          data.reference = 'IT-' + stamp.slice(-6)
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'reference',
      type: 'text',
      unique: true,
      index: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        { name: 'destination', type: 'text', required: true, admin: { width: '50%' } },
        {
          name: 'tourType',
          type: 'select',
          required: true,
          defaultValue: 'private',
          options: [
            { label: 'Private', value: 'private' },
            { label: 'Group', value: 'group' },
            { label: 'Yacht', value: 'yacht' },
            { label: 'Villa', value: 'villa' },
          ],
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'travelDate',
          type: 'date',
          admin: { width: '50%', date: { pickerAppearance: 'dayOnly' } },
        },
        { name: 'guests', type: 'number', defaultValue: 2, min: 1, max: 40, admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'fullName', type: 'text', admin: { width: '50%' } },
        { name: 'email', type: 'email', admin: { width: '50%' } },
      ],
    },
    { name: 'notes', type: 'textarea' },
    {
      name: 'source',
      type: 'group',
      admin: { description: 'Captured automatically from the request.' },
      fields: [
        {
          name: 'locale',
          type: 'select',
          options: [
            { label: 'English', value: 'en' },
            { label: 'Espanol', value: 'es' },
            { label: 'Deutsch', value: 'de' },
          ],
        },
        { name: 'currency', type: 'text' },
        { name: 'path', type: 'text' },
      ],
    },
  ],
}
