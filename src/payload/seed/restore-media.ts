import { getPayload } from 'payload'
import config from '../../payload.config'
import assets from './assets.json' with { type: 'json' }
import { altText } from './alt-text'
import { SEED_USER_AGENT, extensionFor } from './fetch-asset'

/**
 * Re-downloads the binaries behind existing Media documents.
 *
 * The database and the uploaded files live in two different places: documents go to
 * MongoDB, but the actual images live on UploadThing (see `uploadthingStorage` in
 * payload.config.ts). A machine that clones the repo and points at an already-seeded
 * database gets every Media document; a document whose upload never made it to
 * UploadThing (or was deleted there) still carries no `url`, and the site renders
 * with broken imagery while looking, from the database's point of view, perfectly
 * healthy.
 *
 * `npm run seed` would fix it only by wiping and recreating all content, discarding
 * anything edited in the dashboard since. This restores the files in place instead:
 * each document keeps its `id`, so every relationship pointing at it stays valid, and
 * Payload regenerates the six resized variants from the re-uploaded original.
 *
 * Safe to re-run: a document that already has a `url` is skipped. That check matters
 * because Payload treats each re-upload as a new file and de-duplicates the name
 * against the document that already holds it — so an unconditional re-run would
 * rewrite `hero.webp` as `hero-1.webp`, then `hero-2.webp`, leaving orphaned copies
 * behind every time. Pass --force to re-download anyway.
 *
 * Every source in `assets.json` is a Wikimedia Commons file, addressed through
 * Commons' own `Special:FilePath/<file>` redirect so a re-run still finds the image
 * even if it is later renamed on-wiki. Commons hosts only public-domain or
 * Creative-Commons-licensed media, with the exact license stated on each file's own
 * page — check that page before reusing an image anywhere outside this demo seed.
 */

type AssetKey = keyof typeof assets

const restore = async () => {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({ collection: 'media', limit: 1000, pagination: false })
  payload.logger.info(`--- restoring binaries for ${docs.length} media documents ---`)

  const force = process.argv.includes('--force')

  let restored = 0
  let skipped = 0
  let present = 0

  for (const doc of docs) {
    const filename = String(doc.filename ?? '')
    // The seed uploads each asset as `<key>.<ext>`, so the stem is the asset key.
    const key = filename.replace(/\.[^.]+$/, '') as AssetKey
    const url = assets[key]

    if (!force && doc.url) {
      present += 1
      continue
    }

    if (!url) {
      payload.logger.warn(`  no source asset for "${filename}" — leaving it alone`)
      skipped += 1
      continue
    }

    try {
      const response = await fetch(url, { headers: { 'User-Agent': SEED_USER_AGENT } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const buffer = Buffer.from(await response.arrayBuffer())
      const contentType = response.headers.get('content-type') ?? 'image/jpeg'
      const extension = extensionFor(contentType)

      await payload.update({
        collection: 'media',
        id: doc.id,
        // `alt` is required, so preserve whatever the document already carries
        // rather than overwriting an editor's translation with the seed default.
        data: { alt: doc.alt ?? altText[key] ?? key },
        file: {
          data: buffer,
          mimetype: contentType,
          name: `${key}.${extension}`,
          size: buffer.byteLength,
        },
      })

      restored += 1
      payload.logger.info(`  restored ${filename} (${Math.round(buffer.byteLength / 1024)} KB)`)
    } catch (error) {
      skipped += 1
      payload.logger.error(`  failed ${filename}: ${(error as Error).message}`)
    }
  }

  payload.logger.info(
    `Done — ${restored} restored, ${present} already present, ${skipped} skipped.`,
  )
  process.exit(skipped > 0 && restored === 0 ? 1 : 0)
}

await restore()
