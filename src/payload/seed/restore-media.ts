import { existsSync } from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '../../payload.config'
import assets from './assets.json' with { type: 'json' }
import { altText } from './alt-text'

/**
 * Re-downloads the binaries behind existing Media documents.
 *
 * The database and the uploaded files live in two different places: documents go to
 * MongoDB, but `Media.upload.staticDir` writes the actual images to `media/` on local
 * disk, and that directory is gitignored. So a machine that clones the repo and points
 * at an already-seeded database gets every Media document and none of the files —
 * `/api/media/file/<name>` then 500s and the whole site renders with broken imagery
 * while looking, from the database's point of view, perfectly healthy.
 *
 * `npm run seed` would fix it only by wiping and recreating all content, discarding
 * anything edited in the dashboard since. This restores the files in place instead:
 * each document keeps its `id`, so every relationship pointing at it stays valid, and
 * Payload regenerates the six resized variants from the re-uploaded original.
 *
 * Safe to re-run: a document whose file is already on disk is skipped. That check
 * matters because Payload treats each re-upload as a new file and de-duplicates the
 * name against the document that already holds it — so an unconditional re-run would
 * rewrite `hero.webp` as `hero-1.webp`, then `hero-2.webp`, leaving orphaned copies
 * behind every time. Pass --force to re-download anyway.
 */

type AssetKey = keyof typeof assets

const restore = async () => {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({ collection: 'media', limit: 1000, pagination: false })
  payload.logger.info(`--- restoring binaries for ${docs.length} media documents ---`)

  const force = process.argv.includes('--force')
  const staticDir = path.resolve(process.cwd(), 'media')

  let restored = 0
  let skipped = 0
  let present = 0

  for (const doc of docs) {
    const filename = String(doc.filename ?? '')
    // The seed uploads each asset as `<key>.<ext>`, so the stem is the asset key.
    const key = filename.replace(/\.[^.]+$/, '') as AssetKey
    const url = assets[key]

    if (!force && filename && existsSync(path.join(staticDir, filename))) {
      present += 1
      continue
    }

    if (!url) {
      payload.logger.warn(`  no source asset for "${filename}" — leaving it alone`)
      skipped += 1
      continue
    }

    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const buffer = Buffer.from(await response.arrayBuffer())
      const contentType = response.headers.get('content-type') ?? 'image/jpeg'
      const extension = contentType.includes('png') ? 'png' : 'jpg'

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
