import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '../../payload.config'

/**
 * One-off migration for the switch from local-disk storage to UploadThing
 * (see Media.ts and payload.config.ts). Every Media document created before that
 * switch has a `filename` but no `url` — the file itself still only exists in this
 * machine's gitignored `public/media/`, which is exactly what never made it to
 * Vercel. This re-uploads each one from that local copy so the storage adapter
 * populates `url` (and regenerates the size variants) the same way a fresh upload
 * would.
 *
 * Safe to re-run: a document whose `url` already points at UploadThing is skipped.
 * A document created before this migration still has Payload's old default `url`
 * (`<serverURL>/api/media/file/<name>`, persisted in Mongo at upload time, not
 * recomputed on read) — that's what marks it as needing migration. `payload run`
 * doesn't forward CLI args to the script, so set MIGRATE_FORCE=1 to re-upload
 * everything regardless.
 */

const EXT_MIME: Record<string, string> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
}

const migrate = async () => {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({ collection: 'media', limit: 1000, pagination: false })
  payload.logger.info(`--- migrating ${docs.length} media documents to UploadThing ---`)

  const force = process.env.MIGRATE_FORCE === '1'
  const staticDir = path.resolve(process.cwd(), 'public', 'media')

  let migrated = 0
  let skipped = 0
  let missing = 0

  for (const doc of docs) {
    const filename = String(doc.filename ?? '')
    const alreadyMigrated = Boolean(doc.url) && !String(doc.url).includes('/api/media/file/')

    if (!force && alreadyMigrated) {
      skipped += 1
      continue
    }

    const filePath = path.join(staticDir, filename)
    if (!filename || !existsSync(filePath)) {
      payload.logger.warn(`  no local file for "${filename}" — leaving it alone`)
      missing += 1
      continue
    }

    try {
      const buffer = readFileSync(filePath)
      const extension = filename.split('.').pop()?.toLowerCase() ?? ''
      const mimetype = EXT_MIME[extension] ?? 'image/jpeg'

      await payload.update({
        collection: 'media',
        id: doc.id,
        // `alt` is required, so re-send whatever the document already carries.
        data: { alt: doc.alt },
        file: { data: buffer, mimetype, name: filename, size: buffer.byteLength },
      })

      migrated += 1
      payload.logger.info(`  migrated ${filename} (${Math.round(buffer.byteLength / 1024)} KB)`)
    } catch (error) {
      missing += 1
      payload.logger.error(`  failed ${filename}: ${(error as Error).message}`)
    }
  }

  payload.logger.info(`Done — ${migrated} migrated, ${skipped} already on UploadThing, ${missing} skipped.`)
  process.exit(missing > 0 && migrated === 0 ? 1 : 0)
}

await migrate()
