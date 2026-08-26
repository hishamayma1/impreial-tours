import { getPayload } from 'payload'
import config from '../../payload.config'

import { locales, defaultLocale } from '../../i18n/routing'
import { revalidateRemote } from './revalidate-remote'

/**
 * Adds the missing "Transfers" card to the Services collection.
 *
 *   npm run services:backfill-transfers
 *   npm run services:backfill-transfers -- --clear
 *
 * Transfers is one of the four service families in the navigation and in
 * SiteSettings.enabledServices, but databases seeded before it existed carry only four
 * service documents and the home page shows no card for it. `seed/data.ts` now
 * includes it, but `npm run seed` replaces every content collection — far too blunt a
 * tool for adding one document.
 *
 * Idempotent: a Services document already pointing at /transfers is left alone.
 */

const COPY = {
  en: {
    title: 'Transfers',
    description:
      'Airport meet-and-greet, city-to-city road transfers, and custom routes with a private driver.',
  },
  es: {
    title: 'Traslados',
    description:
      'Recepción en el aeropuerto, traslados por carretera entre ciudades y rutas a medida con chófer privado.',
  },
  de: {
    title: 'Transfers',
    description:
      'Empfang am Flughafen, Ueberlandtransfers zwischen Staedten und individuelle Routen mit privatem Fahrer.',
  },
} as const

const run = async () => {
  const payload = await getPayload({ config })
  const clear = process.argv.includes('--clear')

  const existing = await payload.find({
    collection: 'services',
    where: { href: { equals: '/transfers' } },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  })

  if (clear) {
    for (const doc of existing.docs) {
      await payload.delete({ collection: 'services', id: doc.id, overrideAccess: true })
      payload.logger.info(`deleted service ${doc.id}`)
    }
    payload.logger.info(`--- removed ${existing.docs.length} transfers service(s) ---`)
    await revalidateRemote(['services'], (message) => payload.logger.info(message))
    process.exit(0)
  }

  /**
   * Bicycles moves to order 5 so transfers can take its natural place in the nav
   * order. Matched across the legacy hrefs as well as the current one: the stored
   * value on an older database is still `/tours/cycling`, which only becomes
   * `/bicycles` when `normalizePath` rewrites it on read — so looking for the tidy
   * path alone silently matched nothing and left two services sharing order 4.
   */
  const reorderBicycles = async () => {
    const bicycles = await payload.find({
      collection: 'services',
      where: { href: { in: ['/bicycles', '/tours/cycling', '/tours/bicycles'] } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const doc = bicycles.docs[0]
    if (!doc) return

    if ((doc as { order?: number }).order === 5) return
    await payload.update({
      collection: 'services',
      id: doc.id,
      data: { order: 5 } as never,
      overrideAccess: true,
    })
    payload.logger.info('moved bicycles to order 5')
  }

  if (existing.docs.length > 0) {
    payload.logger.info('A transfers service already exists.')
    await reorderBicycles()
    await revalidateRemote(['services'], (message) => payload.logger.info(message))
    process.exit(0)
  }

  /**
   * The `image` field is required. Rather than upload anything new, reuse a Media
   * document already in the library; a city view suits airport and intercity work.
   */
  const media = await payload.find({
    collection: 'media',
    limit: 100,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })

  const preferred = media.docs.find((doc) =>
    String((doc as { filename?: string }).filename ?? '').startsWith('destCairo'),
  )
  const image = preferred ?? media.docs[0]

  if (!image) {
    payload.logger.error('No media documents found — run `npm run seed` first.')
    process.exit(1)
  }

  const created = await payload.create({
    collection: 'services',
    locale: defaultLocale,
    data: {
      ...COPY[defaultLocale],
      icon: 'transfer',
      href: '/transfers',
      order: 4,
      image: image.id,
      _status: 'published',
    } as never,
    overrideAccess: true,
  })

  // Localized fields are patched onto the created document, one language at a time.
  for (const locale of locales) {
    if (locale === defaultLocale) continue
    await payload.update({
      collection: 'services',
      id: created.id,
      locale,
      data: COPY[locale] as never,
      overrideAccess: true,
    })
  }

  payload.logger.info(`created "Transfers" service (${created.id})`)

  await reorderBicycles()
  await revalidateRemote(['services'], (message) => payload.logger.info(message))
  process.exit(0)
}

await run().catch((error: unknown) => {
  const detail = error as { message?: string; data?: { errors?: Array<{ path?: string }> } }
  console.error('[services:backfill-transfers]', detail.message ?? error)

  const paths = detail.data?.errors?.map((entry) => entry.path).filter(Boolean)
  if (paths?.length) console.error('invalid fields:', paths.join(', '))

  process.exit(1)
})
