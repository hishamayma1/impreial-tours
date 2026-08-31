import payload from 'payload'
import config from '@payload-config'

/**
 * Populates `tours.priceFrom` on documents that predate the field.
 *
 * The field is derived by a `beforeChange` hook, which only fires on save — every
 * tour already in the database therefore has it unset, and an unset value sorts and
 * range-filters as absent. That would silently drop those tours out of the `/tours`
 * catalogue whenever a price filter or a price sort is applied, which reads as a
 * broken filter rather than as stale data.
 *
 * Safe to run repeatedly: it recomputes the same value every time and skips any
 * document already carrying it.
 *
 *   npm run tours:backfill-price
 */

type Doc = Record<string, any>

/** The same computation the field hook performs, so the two cannot disagree. */
const derive = (doc: Doc): number | null => {
  const raw = doc.tourType === 'experience' ? doc.pricing?.basePricePerPerson : doc.pricePerPerson
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
}

const run = async () => {
  const p = await payload.init({ config })

  /**
   * Published documents only. `update` on a drafts-enabled collection without
   * `draft: true` writes a published version, so sweeping drafts in here would
   * publish work an editor has not approved — the exact thing Section 4's approval
   * workflow exists to prevent. A draft picks the field up on its own next save.
   */
  const { docs } = await p.find({
    collection: 'tours',
    depth: 0,
    limit: 0,
    pagination: false,
    where: { _status: { equals: 'published' } },
    overrideAccess: true,
    select: { tourType: true, pricePerPerson: true, pricing: true, priceFrom: true, title: true },
  })

  let written = 0
  let skipped = 0

  for (const doc of docs as unknown as Doc[]) {
    const next = derive(doc)
    if (doc.priceFrom === next || (doc.priceFrom == null && next === null)) {
      skipped += 1
      continue
    }

    /**
     * The source fields are resent rather than `priceFrom` itself: the field is
     * admin-readOnly and its hook recomputes the value from whatever `data` carries,
     * so writing the derived number directly would be discarded. Sending the two
     * pricing fields back unchanged gives the hook what it needs and touches nothing
     * else on the document.
     */
    await p.update({
      id: String(doc.id),
      collection: 'tours',
      depth: 0,
      overrideAccess: true,
      data: { pricePerPerson: doc.pricePerPerson, pricing: doc.pricing } as never,
    })

    written += 1
    p.logger.info(`priceFrom = ${next ?? 'null'} — ${doc.title ?? doc.id}`)
  }

  p.logger.info(`Backfill complete — ${written} updated, ${skipped} already correct`)
  process.exit(0)
}

await run()
