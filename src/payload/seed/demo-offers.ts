import { getPayload } from 'payload'
import config from '../../payload.config'

import { locales } from '../../i18n/routing'
import { revalidateRemote } from './revalidate-remote'

/**
 * Turns the home page offers carousel on with sample data, and off again.
 *
 *   npm run demo:offers          flag three tours as offers
 *   npm run demo:offers -- --clear   switch them all back off
 *
 * The carousel is driven by `Tours.offer.active`, so it renders nothing until an
 * editor flags something. On a freshly seeded database that means the band is simply
 * absent, which makes it awkward to look at while building. This flags a
 * representative spread — one day tour and two multi-day experiences — without
 * touching anything else on those documents.
 *
 * Nothing here is destructive: it writes one group of fields on at most three tours,
 * and `--clear` reverses it exactly. It is also idempotent, so re-running is a no-op
 * beyond rewriting the same values.
 *
 * `offer.label` is localized, so the group is written once per language — sending it
 * for a single locale would leave the other two with the flag set and no badge text.
 */

const DEMO = [
  {
    match: 'daily' as const,
    label: { en: 'Save 15%', es: 'Ahorra un 15%', de: '15% sparen' },
  },
  {
    match: 'experience' as const,
    label: { en: 'Limited dates', es: 'Fechas limitadas', de: 'Begrenzte Termine' },
  },
  {
    match: 'experience' as const,
    label: { en: 'Two places left', es: 'Quedan dos plazas', de: 'Noch zwei Plaetze' },
  },
]

const run = async () => {
  const payload = await getPayload({ config })
  const clear = process.argv.includes('--clear')

  if (clear) {
    const { docs } = await payload.find({
      collection: 'tours',
      where: { 'offer.active': { equals: true } },
      limit: 100,
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })

    for (const doc of docs) {
      for (const locale of locales) {
        await payload.update({
          collection: 'tours',
          id: doc.id,
          locale,
          data: { offer: { active: false, label: null } } as never,
          overrideAccess: true,
        })
      }
      payload.logger.info(`cleared offer on "${(doc as { title?: string }).title ?? doc.id}"`)
    }

    payload.logger.info(`--- cleared ${docs.length} demo offer(s) ---`)
    await revalidateRemote(['tours'], (message) => payload.logger.info(message))
    process.exit(0)
  }

  /**
   * Candidates, day tours first.
   *
   * Order matters because of a data problem this script kept tripping over: the
   * seeded experiences have itinerary rows whose `dayTitle` and `dayDescription` are
   * empty in English and Spanish, and both are `required`. Payload validates the
   * whole document on every write, so ANY update to those tours is rejected with a
   * wall of "This field is required" — in this script and in the dashboard alike.
   * Day tours have no itinerary, so they are the reliable ones to demo with.
   */
  const { docs: candidates } = await payload.find({
    collection: 'tours',
    where: { _status: { equals: 'published' } },
    limit: 50,
    pagination: false,
    depth: 0,
    sort: '-createdAt',
    overrideAccess: true,
  })

  const ordered = [
    ...candidates.filter((doc) => (doc as { tourType?: string }).tourType === 'daily'),
    ...candidates.filter((doc) => (doc as { tourType?: string }).tourType !== 'daily'),
  ]

  if (ordered.length === 0) {
    payload.logger.warn('No published tours found — seed the database first (npm run seed).')
    process.exit(1)
  }

  let created = 0
  const blocked: string[] = []

  for (const doc of ordered) {
    if (created >= DEMO.length) break
    const title = String((doc as { title?: string }).title ?? doc.id)
    const label = DEMO[created].label

    try {
      for (const locale of locales) {
        await payload.update({
          collection: 'tours',
          id: doc.id,
          locale,
          data: { offer: { active: true, label: label[locale] } } as never,
          overrideAccess: true,
        })
      }
      created += 1
      payload.logger.info(`offer "${label.en}" -> ${title}`)
    } catch (error) {
      /**
       * A document that cannot be written is skipped, not fatal — but the reason has
       * to survive. Reporting only a validation-error count was wrong: anything that
       * is not a validation failure counted zero, so a timeout or a connection drop
       * was reported as "0 validation errors", which reads as "nothing was wrong".
       */
      const detail = error as { message?: string; data?: { errors?: Array<{ path?: string }> } }
      const fields = detail.data?.errors?.map((entry) => entry.path).filter(Boolean) ?? []

      blocked.push(
        fields.length
          ? `${title} — required but empty: ${fields.slice(0, 4).join(', ')}${fields.length > 4 ? `, +${fields.length - 4} more` : ''}`
          : `${title} — ${detail.message ?? String(error)}`,
      )
    }
  }

  payload.logger.info(`--- ${created} demo offer(s) created ---`)

  if (blocked.length > 0) {
    payload.logger.warn(`Skipped ${blocked.length} tour(s):`)
    for (const entry of blocked) payload.logger.warn(`  - ${entry}`)
  }

  await revalidateRemote(['tours'], (message) => payload.logger.info(message))
  process.exit(created > 0 ? 0 : 1)
}

/**
 * Top-level await, matching run.ts and restore-media.ts.
 *
 * `payload run` finishes as soon as the module body does; kicking the work off with
 * `void run()` let the process exit while `getPayload` was still connecting, so the
 * script reported success having done nothing at all.
 */
await run().catch((error: unknown) => {
  const detail = error as { message?: string; data?: { errors?: Array<{ path?: string }> } }
  console.error('[demo:offers]', detail.message ?? error)

  // Payload validation failures carry the offending field paths; without printing
  // them the error is just "The following field is invalid" and tells you nothing.
  const paths = detail.data?.errors?.map((entry) => entry.path).filter(Boolean)
  if (paths?.length) console.error('[demo:offers] invalid fields:', paths.join(', '))

  process.exit(1)
})
