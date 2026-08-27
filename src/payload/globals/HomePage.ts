import type { GlobalConfig } from 'payload'
import { anyone, isEditor } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'

/**
 * Editorial copy for the homepage. Every text field is optional: when blank the
 * front end falls back to the translated string in messages/{locale}.json, so the
 * site is never broken by an empty CMS.
 */
const sectionHeading = (name: string, label: string) => ({
  name,
  type: 'group' as const,
  label,
  fields: [
    { name: 'eyebrow', type: 'text' as const, localized: true },
    { name: 'title', type: 'text' as const, localized: true },
    { name: 'body', type: 'textarea' as const, localized: true, maxLength: 400 },
  ],
})

export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: 'Home page',
  admin: { group: 'Pages' },
  access: { read: anyone, update: isEditor },
  versions: { drafts: true },
  hooks: { afterChange: [revalidateGlobal('home-page')] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Hero',
          fields: [
            {
              name: 'hero',
              type: 'group',
              fields: [
                { name: 'title', type: 'textarea', localized: true, required: true },
                { name: 'subtitle', type: 'textarea', localized: true, maxLength: 300 },
                { name: 'image', type: 'upload', relationTo: 'media', required: true },
                {
                  name: 'defaultDestination',
                  type: 'text',
                  defaultValue: 'Cairo/Giza',
                  admin: { description: 'Pre-filled value of the search widget.' },
                },
              ],
            },
          ],
        },
        {
          label: 'Sections',
          fields: [
            sectionHeading('servicesSection', 'Our Services'),
            sectionHeading('offersSection', 'Limited-Edition Offers'),
            sectionHeading('destinationsSection', 'Featured Destinations'),
            sectionHeading('testimonialsSection', 'Client Testimonials'),
            sectionHeading('planSection', 'Plan your journey'),
          ],
        },
        {
          label: 'SEO',
          fields: [
            { name: 'seoTitle', type: 'text', localized: true },
            { name: 'seoDescription', type: 'textarea', localized: true, maxLength: 300 },
            { name: 'seoImage', type: 'upload', relationTo: 'media' },
          ],
        },
      ],
    },
  ],
}
