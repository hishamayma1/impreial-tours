import { getPayload } from 'payload'
import config from '../../payload.config'

import { locales, type Locale } from '../../i18n/routing'
import { revalidateRemote } from './revalidate-remote'
import { STARTER_DESTINATIONS, TRANSFER_EXTRAS, transferSeeds } from './services-data'

/**
 * Restores the transfer text lost to the seed's array-row bug.
 *
 *   npm run transfers:backfill-names             (report only — writes nothing)
 *   npm run transfers:backfill-names -- write    (apply)
 *
 * The same bug `backfill-localized-rows.ts` repairs for tours and hotels: the seed sent
 * each translation's arrays without row ids, so every per-locale write replaced the
 * rows instead of patching them, and the localized text inside them — vehicle classes,
 * zone names, route cities — was lost. Prices, capacities and row ids survived.
 *
 * On the site that left the transfer forms unusable: vehicle cards with no name (the
 * name is also what the price is looked up by, so none could be selected), routes
 * reading "→ · 220 km", and airport zones with no destinations to choose from.
 *
 * This writes the text back onto the EXISTING rows by id, in every locale, from the
 * seed copy in services-data.ts. Rows are matched by position and only written when
 * the numbers agree with the seed (price and capacity) — a row an editor has since
 * changed is reported and left alone. Text an editor has already entered is kept.
 *
 * Safe to run more than once.
 */

type Row = Record<string, any> & { id?: string }

/**
 * Reporting is the default and writing must be asked for by name. A bare word rather
 * than a `--flag`: `payload run` parses its arguments with minimist and passes only
 * positional ones through, so a `--dry-run` flag never reaches the script — and a
 * safety switch that silently vanishes is worse than none.
 */
const dryRun = !process.argv.slice(2).includes('write')

/** Keeps what an editor wrote; fills only what is empty. */
const keep = (current: unknown, fallback: string): string =>
  typeof current === 'string' && current.trim() ? current : fallback

const run = async () => {
  const p = await getPayload({ config })
  const problems: string[] = []
  let written = 0

  for (const seed of transferSeeds) {
    const found = await p.find({
      collection: 'transfers',
      where: { transferType: { equals: seed.transferType } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      draft: true,
    })
    const docId = found.docs[0]?.id
    if (!docId) {
      problems.push(`No ${seed.transferType} transfer document — skipped`)
      continue
    }

    /** Pricing rows carry the class name; match each to the seed by position and price. */
    const priceRows = (
      rows: Row[],
      prices: Array<{ price: number; vehicleIndex: number }>,
      locale: Locale,
      where: string,
    ) =>
      rows.map((row, index) => {
        const seedRow = prices[index]
        const vehicle = seedRow ? seed.vehicles[seedRow.vehicleIndex] : undefined
        if (!seedRow || !vehicle || row.price !== seedRow.price || row.maxPassengers !== vehicle.maxPassengers) {
          if (!row.vehicleClass) problems.push(`${where} vehicle row ${index + 1} differs from the seed — left for an editor`)
          return row
        }
        return { ...row, vehicleClass: keep(row.vehicleClass, vehicle.names[locale]) }
      })

    for (const locale of locales) {
      const current = (
        await p.findByID({
          collection: 'transfers',
          id: docId,
          locale,
          fallbackLocale: false as never,
          depth: 0,
          overrideAccess: true,
          draft: true,
        })
      ) as Row

      const copy = seed.copy[locale]
      const data: Row = {
        title: keep(current.title, copy.title),
        description: keep(current.description, copy.description),
      }

      data.vehicles = ((current.vehicles ?? []) as Row[]).map((row, index) => {
        const vehicle = seed.vehicles[index]
        return vehicle && row.maxPassengers === vehicle.maxPassengers
          ? { ...row, className: keep(row.className, vehicle.names[locale]) }
          : row
      })

      // Add-ons lost their labels the same way, and Payload validates the whole document
      // on every write — an unlabelled extra would reject the fixes above as well.
      if (Array.isArray(current.extras)) {
        data.extras = (current.extras as Row[]).map((row, index) => {
          const extra = TRANSFER_EXTRAS[index]
          return extra && row.price === extra.price
            ? {
                ...row,
                label: keep(row.label, extra.copy[locale].label),
                description: keep(row.description, extra.copy[locale].description),
              }
            : row
        })
      }

      if (seed.zones) {
        data.zones = ((current.zones ?? []) as Row[]).map((zone, index) => {
          const seedZone = seed.zones?.[index]
          if (!seedZone) return zone
          const areas = (zone.hotelsOrAreas ?? []) as Row[]
          return {
            ...zone,
            zoneName: keep(zone.zoneName, seedZone.names[locale]),
            hotelsOrAreas: areas.length
              ? areas
              : (STARTER_DESTINATIONS[index] ?? []).map((text) => ({ text })),
            vehiclePricing: priceRows(zone.vehiclePricing ?? [], seedZone.prices, locale, `zone ${index + 1}`),
          }
        })
      }

      if (seed.routes) {
        data.routes = ((current.routes ?? []) as Row[]).map((route, index) => {
          const seedRoute = seed.routes?.[index]
          if (!seedRoute || route.distanceKm !== seedRoute.distanceKm) {
            if (!route.fromCity) problems.push(`route ${index + 1} differs from the seed — left for an editor`)
            return route
          }
          return {
            ...route,
            fromCity: keep(route.fromCity, seedRoute.names[locale].fromCity),
            toCity: keep(route.toCity, seedRoute.names[locale].toCity),
            vehiclePricing: priceRows(route.vehiclePricing ?? [], seedRoute.prices, locale, `route ${index + 1}`),
          }
        })
      }

      // Report what is missing now and what this pass would fill.
      const before = describe(current)
      const after = describe({ ...current, ...data })
      console.log(`[${seed.transferType}/${locale}] before: ${before}`)
      console.log(`[${seed.transferType}/${locale}]  after: ${after}`)

      if (dryRun) continue

      await p.update({
        collection: 'transfers',
        id: docId,
        locale,
        data: { ...data, _status: 'published' } as never,
        overrideAccess: true,
      })
      written += 1
    }
  }

  for (const problem of problems) console.log(problem)
  console.log(dryRun ? '--- report only: nothing written (add "write" to apply) ---' : `--- ${written} locale document(s) written ---`)

  if (!dryRun && written) {
    await revalidateRemote(['transfers'], (message) => console.log(message))
  }
  process.exit(problems.length && !dryRun ? 1 : 0)
}

/** One line per document: the names a customer would see. */
const describe = (doc: Row): string => {
  const parts = [`title="${doc.title ?? ''}"`, `slug="${doc.slug ?? ''}"`]
  if ((doc.extras ?? []).length) {
    parts.push(`extras=[${((doc.extras ?? []) as Row[]).map((e) => e.label || '∅').join(', ')}]`)
  }
  parts.push(`vehicles=[${((doc.vehicles ?? []) as Row[]).map((v) => v.className ?? '∅').join(', ')}]`)
  for (const zone of (doc.zones ?? []) as Row[]) {
    parts.push(
      `zone "${zone.zoneName ?? '∅'}" areas=${(zone.hotelsOrAreas ?? []).length} ` +
        `[${((zone.vehiclePricing ?? []) as Row[]).map((v) => `${v.vehicleClass ?? '∅'}:${v.price}`).join(', ')}]`,
    )
  }
  for (const route of (doc.routes ?? []) as Row[]) {
    parts.push(
      `route "${route.fromCity ?? '∅'} → ${route.toCity ?? '∅'}" ` +
        `[${((route.vehiclePricing ?? []) as Row[]).map((v) => `${v.vehicleClass ?? '∅'}:${v.price}`).join(', ')}]`,
    )
  }
  return parts.join(' | ')
}

// Awaited: `payload run` ends the process when the module finishes loading.
await run().catch((error) => {
  console.error('[transfers:backfill-names]', error?.message ?? error)
  const paths = error?.data?.errors?.map((entry: { path?: string }) => entry.path).filter(Boolean)
  if (paths?.length) console.error('invalid fields:', paths.join(', '))
  process.exit(1)
})
