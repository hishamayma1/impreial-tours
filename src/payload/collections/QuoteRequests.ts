import type { CollectionConfig } from 'payload'
import { canReadBookings, canUpdateBookings, canDeleteBookings, isAdminOrManagerFieldLevel } from '../access'

/**
 * Custom trips carry no catalogue price, so they never become a Booking directly.
 * The public form writes here (through the route handler's Local API call), a manager
 * quotes it, and only then is it converted into a Booking.
 *
 * Same PII posture as Bookings: editors have no access at all.
 */
export const QuoteRequests: CollectionConfig = {
  slug: 'quote-requests',
  labels: { singular: 'Quote request', plural: 'Quote requests' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'serviceInterest', 'date', 'status', 'quotedPrice', 'createdAt'],
    group: 'Sales',
    listSearchableFields: ['name', 'phone', 'email'],
  },
  defaultSort: '-createdAt',
  access: {
    create: canUpdateBookings,
    read: canReadBookings,
    update: canUpdateBookings,
    delete: canDeleteBookings,
  },
  fields: [
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      index: true,
      admin: { position: 'sidebar' },
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Quoted', value: 'quoted' },
        { label: 'Converted', value: 'converted' },
        { label: 'Closed', value: 'closed' },
      ],
    },
    {
      name: 'serviceInterest',
      type: 'select',
      defaultValue: 'transfers',
      admin: { position: 'sidebar' },
      options: [
        { label: 'Tours', value: 'tours' },
        { label: 'Hotels', value: 'hotels' },
        { label: 'Transfers', value: 'transfers' },
        { label: 'Bicycles', value: 'bicycles' },
      ],
    },
    {
      name: 'preferredLanguage',
      type: 'select',
      defaultValue: 'en',
      admin: { position: 'sidebar' },
      options: [
        { label: 'English', value: 'en' },
        { label: 'Español', value: 'es' },
        { label: 'Deutsch', value: 'de' },
      ],
    },

    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, admin: { width: '33%' } },
        { name: 'phone', type: 'text', required: true, admin: { width: '33%' } },
        { name: 'email', type: 'email', admin: { width: '33%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'pickupLocation', type: 'text', admin: { width: '50%' } },
        { name: 'dropoffLocation', type: 'text', admin: { width: '50%' } },
      ],
    },
    {
      name: 'stops',
      type: 'array',
      labels: { singular: 'Stop', plural: 'Stops' },
      fields: [{ name: 'location', type: 'text', required: true }],
    },
    {
      type: 'row',
      fields: [
        { name: 'date', type: 'date', index: true, admin: { width: '33%' } },
        { name: 'time', type: 'text', admin: { width: '33%' } },
        { name: 'vehiclePreference', type: 'text', admin: { width: '33%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'passengers', type: 'number', min: 1, defaultValue: 2, admin: { width: '50%' } },
        { name: 'luggage', type: 'number', min: 0, defaultValue: 2, admin: { width: '50%' } },
      ],
    },
    { name: 'specialRequests', type: 'textarea' },

    {
      type: 'row',
      fields: [
        {
          name: 'quotedPrice',
          type: 'number',
          min: 0,
          // Managers quote; support staff can see the figure but not set it.
          access: { update: isAdminOrManagerFieldLevel },
          admin: { width: '50%' },
        },
        {
          name: 'quotedBy',
          type: 'relationship',
          relationTo: 'users',
          access: { update: isAdminOrManagerFieldLevel },
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'whatsappSentAt',
      type: 'date',
      admin: {
        readOnly: true,
        description: 'Set when the customer was handed the WhatsApp deep link.',
      },
    },
    {
      name: 'convertTrigger',
      type: 'ui',
      admin: {
        components: {
          Field: '@/payload/components/ConvertToBooking#ConvertToBooking',
        },
      },
    },
    {
      name: 'convertedBooking',
      type: 'relationship',
      relationTo: 'bookings',
      admin: { readOnly: true, description: 'Filled in by "Convert to booking".' },
    },
  ],
}
