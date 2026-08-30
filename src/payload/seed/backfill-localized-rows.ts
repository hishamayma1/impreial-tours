import payload from 'payload'
import config from '@payload-config'

import { locales, defaultLocale, type Locale } from '../../i18n/routing'
import { tourSeeds, hotelSeeds } from './services-data'

/**
 * Repairs translations lost to the array-row bug fixed in `seed-services.ts`.
 *
 * The original seed sent each translation's arrays without row ids, so every
 * per-locale update replaced the rows rather than patching them: only the last locale
 * written (German) kept its text. On the site that showed as an experience page with
 * no day-by-day itinerary in English or Spanish, and hotels with unnamed rooms.
 *
 * The rows themselves survived — ids, day numbers, meals, prices — so this writes the
 * missing localized text back onto them by id instead of re-seeding, which would
 * change every document id and orphan the bookings that point at them.
 *
 * Documents are matched on their German title, the one locale the bug left intact.
 * Safe to run more than once: it writes the same values each time.
 *
 *   npm run services:backfill-locales
 */

type Row = Record<string, unknown> & { id?: string }

const run = async () => {
  const p = await payload.init({ config })
  const targets = locales.filter((locale) => locale !== 'de')
  let toursFixed = 0
  let hotelsFixed = 0

  const findByGermanTitle = async (
    collection: 'tours' | 'hotels',
    field: 'title' | 'name',
    value: string,
  ) => {
    const res = await p.find({
      collection,
      locale: 'de',
      where: { [field]: { equals: value } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return res.docs[0] as unknown as (Row & { id: string }) | undefined
  }

  for (const tour of tourSeeds) {
    if (!tour.experience) continue

    const doc = await findByGermanTitle('tours', 'title', tour.copy.de.title)
    if (!doc) {
      p.logger.warn(`No tour found for "${tour.copy.de.title}" — skipped`)
      continue
    }

    const rows = (doc.itinerary ?? []) as Row[]

    for (const locale of targets) {
      const days = tour.experience.days[locale as Locale]
      await p.update({
        collection: 'tours',
        id: doc.id,
        locale: locale as Locale,
        overrideAccess: true,
        data: {
          itinerary: days.map((day, index) => ({
            id: rows[index]?.id,
            dayNumber: index + 1,
            dayTitle: day.dayTitle,
            dayDescription: day.dayDescription,
            meals: index === 0 ? ['dinner'] : ['breakfast', 'lunch', 'dinner'],
          })),
          _status: 'published',
        } as never,
      })
    }

    toursFixed += 1
    p.logger.info(`Restored ${tour.experience.days[defaultLocale].length} itinerary days: ${tour.copy.en.title}`)
  }

  for (const hotel of hotelSeeds) {
    const doc = await findByGermanTitle('hotels', 'name', hotel.copy.de.name)
    if (!doc) {
      p.logger.warn(`No hotel found for "${hotel.copy.de.name}" — skipped`)
      continue
    }

    const rows = (doc.roomTypes ?? []) as Row[]
    const seasons = (doc.seasonalRates ?? []) as Row[]

    for (const locale of targets) {
      await p.update({
        collection: 'hotels',
        id: doc.id,
        locale: locale as Locale,
        overrideAccess: true,
        data: {
          roomTypes: hotel.rooms.map((room, index) => ({
            ...(rows[index] ?? {}),
            id: rows[index]?.id,
            roomName: room.names[locale as Locale].roomName,
            bedConfiguration: room.names[locale as Locale].bedConfiguration,
          })),
          // A seasonal rate label is required and was lost to the same bug, so the
          // rows have to be resent or the whole update is rejected as invalid.
          seasonalRates: hotel.seasons.map((season, index) => ({
            ...(seasons[index] ?? {}),
            id: seasons[index]?.id,
            label: season.labels[locale as Locale],
          })),
          _status: 'published',
        } as never,
      })
    }

    hotelsFixed += 1
    p.logger.info(`Restored ${hotel.rooms.length} room names: ${hotel.copy.en.name}`)
  }

  p.logger.info(`Backfill complete — ${toursFixed} tours, ${hotelsFixed} hotels`)
  process.exit(0)
}

await run()
