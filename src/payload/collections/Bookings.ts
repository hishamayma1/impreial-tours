import type { CollectionConfig } from 'payload'
import {
  canReadBookings,
  canUpdateBookings,
  canDeleteBookings,
  canCreateBookings,
  isAdminFieldLevel,
} from '../access'
import { withBookingReference, recalculateTotals, notifyOnBooking } from '../hooks/booking'

const serviceIs =
  (...types: string[]) =>
  (data: Record<string, unknown>) =>
    types.includes(String(data?.serviceType))

/**
 * One collection for all five services. Reporting, reference numbers and customer
 * history stay in one place; the per-service specifics live in conditional groups
 * under `serviceDetails`.
 *
 * Access: editors are excluded entirely (customer PII). Public submissions come in
 * through the checkout route handler using the Local API with overrideAccess, so
 * `create` here stays staff-only.
 */
export const Bookings: CollectionConfig = {
  slug: 'bookings',
  labels: { singular: 'Booking', plural: 'Bookings' },
  admin: {
    useAsTitle: 'bookingReference',
    defaultColumns: [
      'bookingReference',
      'serviceType',
      'customer',
      'dates',
      'pricing',
      'status',
    ],
    group: 'Sales',
    listSearchableFields: ['bookingReference'],
  },
  defaultSort: '-createdAt',
  access: {
    create: canCreateBookings,
    read: canReadBookings,
    update: canUpdateBookings,
    delete: canDeleteBookings,
  },
  hooks: {
    beforeChange: [withBookingReference, recalculateTotals],
    afterChange: [notifyOnBooking],
  },
  fields: [
    {
      name: 'bookingReference',
      type: 'text',
      unique: true,
      index: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'serviceType',
      type: 'select',
      required: true,
      index: true,
      admin: { position: 'sidebar' },
      options: [
        { label: 'Daily tour', value: 'dailyTour' },
        { label: 'Full experience', value: 'experience' },
        { label: 'Hotel', value: 'hotel' },
        { label: 'Transfer', value: 'transfer' },
        { label: 'Bicycle', value: 'bicycle' },
        // Not in the spec's list: the homepage hero search captures an open enquiry
        // before a specific product is chosen. Keeping it here means one funnel.
        { label: 'General enquiry', value: 'enquiry' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      index: true,
      admin: { position: 'sidebar' },
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Completed', value: 'completed' },
        { label: 'Refunded', value: 'refunded' },
      ],
    },
    {
      name: 'paymentStatus',
      type: 'select',
      defaultValue: 'unpaid',
      admin: { position: 'sidebar' },
      options: [
        { label: 'Unpaid', value: 'unpaid' },
        { label: 'Deposit paid', value: 'deposit' },
        { label: 'Paid', value: 'paid' },
        { label: 'Refunded', value: 'refunded' },
      ],
    },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'website',
      admin: { position: 'sidebar' },
      options: [
        { label: 'Website', value: 'website' },
        { label: 'WhatsApp', value: 'whatsapp' },
        { label: 'Phone', value: 'phone' },
        { label: 'Agent', value: 'agent' },
      ],
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar' },
    },

    {
      name: 'customer',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'firstName', type: 'text', admin: { width: '50%' } },
            { name: 'lastName', type: 'text', admin: { width: '50%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            // Not `required` at the schema level: the homepage hero search captures an
            // enquiry before contact details exist. The checkout route handler enforces
            // name + email with Zod for real bookings.
            { name: 'email', type: 'email', admin: { width: '50%' } },
            { name: 'phone', type: 'text', admin: { width: '50%' } },
          ],
        },
        { name: 'country', type: 'text' },
        { name: 'locale', type: 'text', admin: { readOnly: true } },
        { name: 'notes', type: 'textarea', admin: { description: 'Written by the customer.' } },
      ],
    },
    {
      name: 'travelers',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'adults', type: 'number', defaultValue: 2, min: 0, admin: { width: '33%' } },
            { name: 'children', type: 'number', defaultValue: 0, min: 0, admin: { width: '33%' } },
            { name: 'infants', type: 'number', defaultValue: 0, min: 0, admin: { width: '33%' } },
          ],
        },
      ],
    },
    {
      name: 'dates',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'startDate', type: 'date', index: true, admin: { width: '50%' } },
            { name: 'endDate', type: 'date', admin: { width: '50%' } },
          ],
        },
      ],
    },

    {
      name: 'lineItems',
      type: 'array',
      admin: {
        description:
          'Built server-side from CMS prices. Totals below are re-derived from these on every save — editing a price here changes the total.',
      },
      fields: [
        {
          name: 'itemType',
          type: 'select',
          options: [
            { label: 'Tour', value: 'tour' },
            { label: 'Room', value: 'room' },
            { label: 'Vehicle', value: 'vehicle' },
            { label: 'Bicycle', value: 'bicycle' },
            { label: 'Extra', value: 'extra' },
          ],
        },
        {
          name: 'refId',
          type: 'relationship',
          relationTo: ['tours', 'hotels', 'transfers', 'bicycles'],
        },
        { name: 'label', type: 'text', required: true },
        {
          type: 'row',
          fields: [
            { name: 'quantity', type: 'number', required: true, min: 0, admin: { width: '33%' } },
            { name: 'unitPrice', type: 'number', required: true, min: 0, admin: { width: '33%' } },
            {
              name: 'subtotal',
              type: 'number',
              admin: { width: '33%', readOnly: true },
            },
          ],
        },
      ],
    },

    {
      name: 'pricing',
      type: 'group',
      // Section 4: booking pricing is admin-only.
      access: { update: isAdminFieldLevel },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'subtotal', type: 'number', admin: { width: '25%', readOnly: true } },
            { name: 'discount', type: 'number', defaultValue: 0, admin: { width: '25%' } },
            {
              name: 'taxRate',
              type: 'number',
              defaultValue: 0,
              admin: { width: '25%', description: 'Fraction, e.g. 0.14' },
            },
            { name: 'tax', type: 'number', admin: { width: '25%', readOnly: true } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'total', type: 'number', admin: { width: '50%', readOnly: true } },
            {
              name: 'currency',
              type: 'text',
              defaultValue: 'USD',
              admin: { width: '50%' },
            },
          ],
        },
      ],
    },

    {
      name: 'serviceDetails',
      type: 'group',
      fields: [
        {
          name: 'hotel',
          type: 'group',
          admin: { condition: serviceIs('hotel') },
          fields: [
            {
              name: 'rooms',
              type: 'array',
              fields: [
                { name: 'roomTypeId', type: 'text', required: true },
                {
                  name: 'occupancy',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Single', value: 'single' },
                    { label: 'Double', value: 'double' },
                    { label: 'Triple', value: 'triple' },
                  ],
                },
                { name: 'guests', type: 'number', min: 1 },
                { name: 'quantity', type: 'number', min: 1, defaultValue: 1 },
              ],
            },
          ],
        },
        {
          name: 'transfer',
          type: 'group',
          admin: { condition: serviceIs('transfer') },
          fields: [
            { name: 'pickup', type: 'text' },
            { name: 'dropoff', type: 'text' },
            { name: 'flightNumber', type: 'text' },
            { name: 'vehicleClass', type: 'text' },
            { name: 'pickupTime', type: 'text' },
            { name: 'roundTrip', type: 'checkbox', defaultValue: false },
          ],
        },
        {
          name: 'bicycle',
          type: 'group',
          admin: { condition: serviceIs('bicycle') },
          fields: [
            { name: 'pickupTime', type: 'text' },
            { name: 'returnTime', type: 'text' },
            {
              name: 'bikeIds',
              type: 'array',
              fields: [{ name: 'bikeId', type: 'text', required: true }],
            },
          ],
        },
        {
          name: 'tour',
          type: 'group',
          admin: { condition: serviceIs('dailyTour', 'experience') },
          fields: [
            { name: 'startTime', type: 'text' },
            { name: 'departureDate', type: 'date' },
            { name: 'privateGroup', type: 'checkbox', defaultValue: false },
            { name: 'singleRooms', type: 'number', min: 0, defaultValue: 0 },
          ],
        },
        {
          name: 'enquiry',
          type: 'group',
          admin: {
            condition: serviceIs('enquiry'),
            description: 'Captured by the homepage hero search before a product is chosen.',
          },
          fields: [
            { name: 'destination', type: 'text' },
            {
              name: 'tourType',
              type: 'select',
              options: [
                { label: 'Private', value: 'private' },
                { label: 'Group', value: 'group' },
                { label: 'Yacht', value: 'yacht' },
                { label: 'Villa', value: 'villa' },
              ],
            },
            { name: 'path', type: 'text' },
          ],
        },
      ],
    },

    {
      name: 'internalNotes',
      type: 'richText',
      // Section 3 states admin-only. See the phase report — support staff currently
      // cannot write here, which may need revisiting against Section 4.
      access: { read: isAdminFieldLevel, update: isAdminFieldLevel },
    },
  ],
}
