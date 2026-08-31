import payload from 'payload'
import config from '@payload-config'

/**
 * Populates `hotels.priceFrom` on documents that predate the field.
 *
 * The field is derived by a `beforeChange` hook, which only fires on save — so every
 * hotel already in the database has it unset, and an unset value sorts and
 * range-filters as absent. Until this runs, the newly-working price filter and price
 * sorts would exclude every existing hotel, which looks far more broken than the
 * inert controls they replace.
 *
 * Safe to run repeatedly: it recomputes the same value and skips anything already
 * correct. Published documents only — `update` on a drafts-enabled collection without
 * `draft: true` writes a published version, and sweeping drafts in here would publish
 * work nobody approved.
 *
 *   npm run hotels:backfill-price
 */

type Doc = Record<string, any>

/** The same computation the field hook performs, so the two cannot disagree. */
const derive = (doc: Doc): number | null => {
  const rates = ((doc.roomTypes ?? []) as Doc[])
    .flatMap((room) => [
      room?.pricing?.singlePrice,
      room?.pricing?.doublePrice,
      room?.pricing?.triplePrice,
    ])
    .filter((rate): rate is number => typeof rate === 'number' && Number.isFinite(rate) && rate > 0)

  return rates.length ? Math.min(...rates) : null
}

const run = async () => {
  const p = await payload.init({ config })

  const { docs } = await p.find({
    collection: 'hotels',
    depth: 0,
    limit: 0,
    pagination: false,
    where: { _status: { equals: 'published' } },
    overrideAccess: true,
    select: { name: true, roomTypes: true, priceFrom: true },
  })

  let written = 0
  let skipped = 0

  for (const doc of docs as unknown as Doc[]) {
    const next = derive(doc)
    if (doc.priceFrom === next || (doc.priceFrom == null && next === null)) {
      skipped += 1
      continue
    }

    // The source field is resent rather than `priceFrom` itself: the field is
    // admin-readOnly and its hook recomputes from whatever `data` carries, so writing
    // the derived number directly would be discarded.
    await p.update({
      id: String(doc.id),
      collection: 'hotels',
      depth: 0,
      overrideAccess: true,
      data: { roomTypes: doc.roomTypes } as never,
    })

    written += 1
    p.logger.info(`priceFrom = ${next ?? 'null'} — ${doc.name ?? doc.id}`)
  }

  p.logger.info(`Backfill complete — ${written} updated, ${skipped} already correct`)
  process.exit(0)
}

await run()
