import type { Block } from 'payload'

/**
 * Layout blocks for the flexible `Pages` collection. Every text field is localized so a
 * landing page can be authored independently per language; images and numbers are not.
 */

export const HeroBlock: Block = {
  slug: 'hero',
  labels: { singular: 'Hero', plural: 'Heroes' },
  fields: [
    { name: 'eyebrow', type: 'text', localized: true },
    { name: 'heading', type: 'text', required: true, localized: true },
    { name: 'body', type: 'textarea', localized: true },
    { name: 'image', type: 'upload', relationTo: 'media' },
    {
      type: 'row',
      fields: [
        { name: 'ctaLabel', type: 'text', localized: true, admin: { width: '50%' } },
        { name: 'ctaHref', type: 'text', admin: { width: '50%' } },
      ],
    },
  ],
}

export const RichTextBlock: Block = {
  slug: 'richText',
  labels: { singular: 'Rich text', plural: 'Rich text' },
  fields: [{ name: 'content', type: 'richText', required: true, localized: true }],
}

/** Curated grids: leave `items` empty to fall back to the newest published records. */
export const TourGridBlock: Block = {
  slug: 'tourGrid',
  labels: { singular: 'Tour grid', plural: 'Tour grids' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'tourType',
      type: 'select',
      defaultValue: 'daily',
      options: [
        { label: 'Daily tours', value: 'daily' },
        { label: 'Full experiences', value: 'experience' },
      ],
    },
    { name: 'items', type: 'relationship', relationTo: 'tours', hasMany: true },
    { name: 'limit', type: 'number', defaultValue: 6, min: 1, max: 24 },
  ],
}

export const HotelGridBlock: Block = {
  slug: 'hotelGrid',
  labels: { singular: 'Hotel grid', plural: 'Hotel grids' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    { name: 'items', type: 'relationship', relationTo: 'hotels', hasMany: true },
    { name: 'limit', type: 'number', defaultValue: 6, min: 1, max: 24 },
  ],
}

export const TestimonialsBlock: Block = {
  slug: 'testimonials',
  fields: [
    { name: 'heading', type: 'text', localized: true },
    { name: 'items', type: 'relationship', relationTo: 'testimonials', hasMany: true },
  ],
}

export const FaqBlock: Block = {
  slug: 'faq',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'question', type: 'text', required: true, localized: true },
        { name: 'answer', type: 'textarea', required: true, localized: true },
      ],
    },
  ],
}

export const CtaBandBlock: Block = {
  slug: 'ctaBand',
  labels: { singular: 'CTA band', plural: 'CTA bands' },
  fields: [
    { name: 'heading', type: 'text', required: true, localized: true },
    { name: 'body', type: 'textarea', localized: true },
    {
      type: 'row',
      fields: [
        { name: 'ctaLabel', type: 'text', localized: true, admin: { width: '50%' } },
        { name: 'ctaHref', type: 'text', admin: { width: '50%' } },
      ],
    },
  ],
}

export const GalleryBlock: Block = {
  slug: 'gallery',
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'images',
      type: 'array',
      minRows: 1,
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'caption', type: 'text', localized: true },
      ],
    },
  ],
}

export const pageBlocks = [
  HeroBlock,
  RichTextBlock,
  TourGridBlock,
  HotelGridBlock,
  TestimonialsBlock,
  FaqBlock,
  CtaBandBlock,
  GalleryBlock,
]
