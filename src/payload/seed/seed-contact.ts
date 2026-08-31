import payload from 'payload'
import config from '@payload-config'

import { locales, type Locale } from '../../i18n/routing'

/**
 * Fills in the company's contact details and social links.
 *
 * `SiteSettings.contact` was empty, which is why the footer, the JSON-LD
 * `Organization` block and the WhatsApp deep link all had nothing to show. The About
 * and Contact pages read the same group, so without this they would print headings
 * over blanks.
 *
 * Demo data: plausible, clearly Egyptian, and yours to replace in the admin under
 * Settings → Site Settings. `address` and `businessHours` are localized, so each
 * language is written separately.
 *
 *   npm run contact:seed
 */

const CONTACT = {
  contactEmail: 'reservations@imperialtours.example',
  phone: '+20 2 2735 8401',
  // Digits only, no + or spaces — this builds the wa.me deep link.
  whatsappNumber: '201001234567',
}

const LOCALIZED: Record<Locale, { address: string; businessHours: string }> = {
  en: {
    address: '12 Road 9, Maadi\nCairo 11431\nEgypt',
    businessHours: 'Sunday to Thursday, 9am – 6pm (EET). WhatsApp answered daily.',
  },
  es: {
    address: 'Calle 9, nº 12, Maadi\nEl Cairo 11431\nEgipto',
    businessHours: 'De domingo a jueves, 9:00 – 18:00 (EET). WhatsApp todos los días.',
  },
  de: {
    address: 'Road 9 Nr. 12, Maadi\nKairo 11431\nÄgypten',
    businessHours: 'Sonntag bis Donnerstag, 9–18 Uhr (EET). WhatsApp täglich erreichbar.',
  },
}

const SOCIAL = [
  { platform: 'instagram', url: 'https://instagram.com/imperialtours' },
  { platform: 'facebook', url: 'https://facebook.com/imperialtours' },
  { platform: 'whatsapp', url: 'https://wa.me/201001234567' },
]

const run = async () => {
  const p = await payload.init({ config })

  for (const locale of locales) {
    await p.updateGlobal({
      slug: 'site-settings',
      locale: locale as Locale,
      overrideAccess: true,
      data: {
        // Non-localized fields are identical in every pass; Payload stores one copy.
        whatsappNumber: CONTACT.whatsappNumber,
        contact: { ...CONTACT, ...LOCALIZED[locale as Locale] },
        socialLinks: SOCIAL,
      } as never,
    })
    p.logger.info(`Contact details written for "${locale}"`)
  }

  p.logger.info(`Seeded contact details and ${SOCIAL.length} social links`)
  process.exit(0)
}

await run()
