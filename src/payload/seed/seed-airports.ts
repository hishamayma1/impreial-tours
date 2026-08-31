import payload from 'payload'
import config from '@payload-config'

import { locales, type Locale } from '../../i18n/routing'

/**
 * Seeds the airports an Egyptian operator actually flies clients into, and attaches
 * them to the published airport-transfer document.
 *
 * The airport transfer became bookable in this change, and the "From" select is
 * populated from the Airports collection — which starts empty, so without this the
 * feature has nothing to offer on day one. Everything here is ordinary content: edit
 * the names, add terminals, or delete a row you do not serve.
 *
 * Safe to run more than once. Airports are matched on their IATA code, so a second run
 * updates the existing records rather than creating a second Cairo.
 *
 *   npm run transfers:seed-airports
 */

type Doc = Record<string, any>

const AIRPORTS = [
  {
    code: 'CAI',
    order: 0,
    terminals: ['Terminal 1', 'Terminal 2', 'Terminal 3'],
    copy: {
      en: { name: 'Cairo International', city: 'Cairo' },
      es: { name: 'Aeropuerto Internacional de El Cairo', city: 'El Cairo' },
      de: { name: 'Internationaler Flughafen Kairo', city: 'Kairo' },
    },
  },
  {
    code: 'HRG',
    order: 1,
    terminals: ['Terminal 1', 'Terminal 2'],
    copy: {
      en: { name: 'Hurghada International', city: 'Hurghada' },
      es: { name: 'Aeropuerto Internacional de Hurgada', city: 'Hurgada' },
      de: { name: 'Internationaler Flughafen Hurghada', city: 'Hurghada' },
    },
  },
  {
    code: 'LXR',
    order: 2,
    terminals: [],
    copy: {
      en: { name: 'Luxor International', city: 'Luxor' },
      es: { name: 'Aeropuerto Internacional de Luxor', city: 'Luxor' },
      de: { name: 'Internationaler Flughafen Luxor', city: 'Luxor' },
    },
  },
  {
    code: 'ASW',
    order: 3,
    terminals: [],
    copy: {
      en: { name: 'Aswan International', city: 'Aswan' },
      es: { name: 'Aeropuerto Internacional de Asuán', city: 'Asuán' },
      de: { name: 'Internationaler Flughafen Assuan', city: 'Assuan' },
    },
  },
]

/**
 * Two add-ons that read as real options rather than filler, one priced per booking and
 * one per passenger, so the form's two pricing modes are both exercised.
 */
const EXTRAS = [
  {
    price: 8,
    perPassenger: false,
    copy: {
      en: { label: 'Child seat', description: 'Fitted and checked before pick-up.' },
      es: { label: 'Silla infantil', description: 'Instalada y revisada antes de la recogida.' },
      de: { label: 'Kindersitz', description: 'Vor der Abholung eingebaut und geprüft.' },
    },
  },
  {
    price: 5,
    perPassenger: true,
    copy: {
      en: { label: 'Chilled water and towels', description: 'Waiting in the car on arrival.' },
      es: { label: 'Agua fría y toallas', description: 'Esperando en el coche a tu llegada.' },
      de: { label: 'Gekühltes Wasser und Tücher', description: 'Bei der Ankunft im Wagen bereit.' },
    },
  },
]

const run = async () => {
  const p = await payload.init({ config })

  const ids: string[] = []

  for (const airport of AIRPORTS) {
    const existing = await p.find({
      collection: 'airports',
      where: { code: { equals: airport.code } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const base = {
      code: airport.code,
      order: airport.order,
      // Row ids are generated on create; resending the same names on a later run
      // simply overwrites them, which is what "safe to re-run" means here.
      terminals: airport.terminals.map((name) => ({ name })),
      _status: 'published',
    }

    const id =
      existing.docs[0]?.id ??
      (
        await p.create({
          collection: 'airports',
          locale: 'en',
          overrideAccess: true,
          data: { ...base, ...airport.copy.en } as never,
        })
      ).id

    // Each locale is written separately: Payload stores one localized value per
    // request, so a single create only ever fills the locale it was made in.
    for (const locale of locales) {
      await p.update({
        id: String(id),
        collection: 'airports',
        locale: locale as Locale,
        overrideAccess: true,
        data: { ...base, ...airport.copy[locale as Locale] } as never,
      })
    }

    ids.push(String(id))
    p.logger.info(`Airport ${airport.code} — ${airport.copy.en.name}`)
  }

  // --- attach to the airport transfer ---------------------------------------
  const transfers = await p.find({
    collection: 'transfers',
    where: { transferType: { equals: 'airport' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const transfer = transfers.docs[0] as Doc | undefined
  if (!transfer) {
    p.logger.warn('No airport transfer document found — airports created but not attached.')
    process.exit(0)
  }

  const existingExtras = (transfer.extras ?? []) as Doc[]

  /**
   * Starter drop-off points, one set per zone, added only where a zone has none.
   *
   * These are what the customer picks from — the pick is what selects the zone, and so
   * the price — so a zone with an empty list leaves the booking form with nothing to
   * offer. An editor is expected to replace these with the hotels they actually serve;
   * a zone that already has its own list is left completely alone.
   */
  const STARTER_DESTINATIONS = [
    ['Four Seasons Nile Plaza', 'Kempinski Nile', 'Zamalek', 'Garden City', 'Downtown Cairo'],
    ['Marriott Mena House', 'Great Pyramid Inn', 'Giza Plateau', 'Sphinx Entrance', 'Saqqara'],
  ]

  /**
   * Each locale is attempted independently, and a failure is reported rather than
   * fatal.
   *
   * Payload validates the whole document on every write, so updating a locale whose
   * required localized fields were never filled in — `zoneName`, `className`,
   * `vehicleClass` — is rejected outright, however little this script is actually
   * changing. On this database only German carries that text, so an all-or-nothing
   * loop would abort having written nothing at all. Attaching what can be attached and
   * naming the locales that need translating is more useful than refusing to start.
   */
  const skipped: string[] = []

  for (const locale of locales) {
    try {
      /**
       * Re-read per locale before resending the zones.
       *
       * `transfer` above was fetched without a locale, so its localized values are the
       * default language's — and resending those while writing German would overwrite
       * the German zone names with English ones (here, with empty ones). Each pass
       * echoes back the text that locale already holds and changes only the
       * destinations.
       */
      const current = (
        await p.find({
          collection: 'transfers',
          locale: locale as Locale,
          where: { transferType: { equals: 'airport' } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
      ).docs[0] as Doc

      await p.update({
        id: String(transfer.id),
        collection: 'transfers',
        locale: locale as Locale,
        overrideAccess: true,
        data: {
          airports: ids,
          extras: EXTRAS.map((extra, index) => ({
            // Reuse the row id when one already exists, so re-running does not orphan
            // an extra that a customer may already have selected on a live booking.
            id: existingExtras[index]?.id,
            price: extra.price,
            perPassenger: extra.perPassenger,
            ...extra.copy[locale as Locale],
          })),
          // Zones are resent whole because Payload replaces an array rather than
          // merging it — sending only the destinations would drop the prices.
          zones: ((current.zones ?? []) as Doc[]).map((zone, index) => ({
            ...zone,
            hotelsOrAreas: (zone.hotelsOrAreas ?? []).length
              ? zone.hotelsOrAreas
              : (STARTER_DESTINATIONS[index] ?? []).map((text) => ({ text })),
          })),
        } as never,
      })
      p.logger.info(`Attached airports and extras in "${locale}"`)
    } catch {
      skipped.push(locale)
    }
  }

  if (skipped.length) {
    p.logger.warn(
      `Could not write ${skipped.join(', ')} — the transfer's localized rows (zone names, ` +
        'vehicle classes) are empty in those locales, so Payload rejects any update to them. ' +
        'Fill those in under Services → Transfers and re-run.',
    )
  }

  p.logger.info(`Created ${ids.length} airports and ${EXTRAS.length} extras for "${transfer.title}"`)
  process.exit(0)
}

await run()
