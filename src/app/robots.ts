import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/seo'

const robots = (): MetadataRoute.Robots => ({
  rules: [
    {
      userAgent: '*',
      allow: '/',
      // Checkout, confirmations and the CMS have nothing to offer a crawler, and
      // confirmations are personal.
      disallow: ['/admin', '/api/', '/*/booking/'],
    },
  ],
  sitemap: `${siteUrl}/sitemap.xml`,
})

export default robots
