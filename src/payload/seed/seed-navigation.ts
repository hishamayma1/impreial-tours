import type { Payload } from 'payload'
import { locales, type Locale } from '../../i18n/routing'

/**
 * Seeds the `Navigation` global with the spec Section 5 structure, in all three
 * languages. Each item carries its `service` key so switching a service off in
 * SiteSettings removes it from the nav without anyone editing this global.
 */
const LABELS: Record<Locale, Record<string, string>> = {
  en: {
    tours: 'Tours', daily: 'Daily Tours', experiences: 'Full Experiences',
    hotels: 'Hotels', transfers: 'Transfers', airport: 'Airport Transfer',
    intercity: 'City to City', custom: 'Custom Trip', bicycles: 'Bicycles',
    about: 'About', contact: 'Contact', cta: 'Book now',
  },
  es: {
    tours: 'Tours', daily: 'Excursiones de un día', experiences: 'Experiencias completas',
    hotels: 'Hoteles', transfers: 'Traslados', airport: 'Traslado al aeropuerto',
    intercity: 'Entre ciudades', custom: 'Viaje a medida', bicycles: 'Bicicletas',
    about: 'Nosotros', contact: 'Contacto', cta: 'Reservar',
  },
  de: {
    tours: 'Touren', daily: 'Tagestouren', experiences: 'Komplett-Erlebnisse',
    hotels: 'Hotels', transfers: 'Transfers', airport: 'Flughafentransfer',
    intercity: 'Stadt zu Stadt', custom: 'Individuelle Reise', bicycles: 'Fahrräder',
    about: 'Über uns', contact: 'Kontakt', cta: 'Jetzt buchen',
  },
}

export const seedNavigation = async (payload: Payload) => {
  for (const locale of locales) {
    const t = LABELS[locale]

    await payload.updateGlobal({
      slug: 'navigation',
      locale,
      data: {
        mainNav: [
          {
            label: t.tours,
            linkType: 'collection',
            collectionPath: '/tours/daily',
            service: 'tours',
            children: [
              { label: t.daily, linkType: 'collection', collectionPath: '/tours/daily', service: 'tours' },
              { label: t.experiences, linkType: 'collection', collectionPath: '/tours/experiences', service: 'tours' },
            ],
          },
          { label: t.hotels, linkType: 'collection', collectionPath: '/hotels', service: 'hotels' },
          {
            label: t.transfers,
            linkType: 'collection',
            collectionPath: '/transfers',
            service: 'transfers',
            children: [
              { label: t.airport, linkType: 'collection', collectionPath: '/transfers/airport', service: 'transfers' },
              { label: t.intercity, linkType: 'collection', collectionPath: '/transfers/intercity', service: 'transfers' },
              { label: t.custom, linkType: 'collection', collectionPath: '/transfers/custom', service: 'transfers' },
            ],
          },
          { label: t.bicycles, linkType: 'collection', collectionPath: '/bicycles', service: 'bicycles' },
          { label: t.about, linkType: 'custom', url: '/about' },
          { label: t.contact, linkType: 'custom', url: '/contact' },
        ],
        cta: { label: t.cta, linkType: 'collection', collectionPath: '/tours/daily' },
      } as never,
    })
  }
  payload.logger.info('Seeded navigation for all locales')
}
