import {
  toPricingConfig, quoteRental, clampHours, entryPrice, presetHours, formatDuration,
} from '../src/lib/rental-pricing.ts'

/**
 * The rental engine's job is to never quote more than the cheapest legitimate route to
 * the same number of hours. Most of these cases are the ones where the obvious lookup
 * gets that wrong.
 */

let pass = 0, fail = 0
const eq = (name: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  if (a === e) { pass++; console.log(`  ok  ${name}`) }
  else { fail++; console.log(`FAIL  ${name}\n      got ${a}\n      want ${e}`) }
}

const BANDS = [
  { durationLabel: 'Half day', durationHours: 6, price: 18 },
  { durationLabel: 'Full day', durationHours: 12, price: 28 },
  { durationLabel: 'Weekly', durationHours: 168, price: 130 },
]

const config = toPricingConfig({
  pricingMode: 'both', hourlyRate: 6, extraHourRate: 4,
  minHours: 1, maxHours: 168, hourStep: 1, bands: BANDS,
  deliveryFee: 15, weekendSurchargePct: 10,
})

// --- normalisation -----------------------------------------------------------
eq('bands are sorted ascending', config.bands.map((b) => b.durationHours), [6, 12, 168])
eq('maxHours stretches to the longest package', toPricingConfig({
  hourlyRate: 6, maxHours: 24, bands: BANDS }).maxHours, 168)
eq('no hourly rate falls back to packages only', toPricingConfig({
  pricingMode: 'both', hourlyRate: null, bands: BANDS }).pricingMode, 'bands')
eq('no packages falls back to hourly only', toPricingConfig({
  pricingMode: 'both', hourlyRate: 6, bands: [] }).pricingMode, 'hourly')
eq('zero-priced package is discarded', toPricingConfig({
  hourlyRate: 6, bands: [{ durationLabel: 'x', durationHours: 3, price: 0 }] }).bands.length, 0)

// --- the cheapest route wins -------------------------------------------------
// 2h hourly = 12, cheaper than the 18 half-day.
eq('2h takes the hourly rate', quoteRental(config, { hours: 2 }).unitPrice, 12)
eq('2h basis is hourly', quoteRental(config, { hours: 2 }).basis?.kind, 'hourly')

// 5h hourly = 30, but the half-day covering it is 18. The package they did not ask
// for is cheaper than the hours they did.
eq('5h is quoted the cheaper half-day', quoteRental(config, { hours: 5 }).unitPrice, 18)
eq('5h basis is the package', quoteRental(config, { hours: 5 }).basis?.kind, 'band')
eq('5h reports the saving', quoteRental(config, { hours: 5 }).savingVsHourly, 12)

// 6h exactly: the package, not 36 of hourly.
eq('6h takes the half-day exactly', quoteRental(config, { hours: 6 }).unitPrice, 18)

// 9h: half day (18) + 3 extra hours at 4 = 30, against the 28 full day covering it.
eq('9h takes the covering full day', quoteRental(config, { hours: 9 }).unitPrice, 28)

// 14h: beyond the full day, under the week. 28 + 2 extra at 4 = 36.
eq('14h is full day plus extra hours', quoteRental(config, { hours: 14 }).unitPrice, 36)
eq('14h basis is band-plus-hours', quoteRental(config, { hours: 14 }).basis?.kind, 'band-plus-hours')

// Part hours over a package bill as whole hours.
eq('12.5h rounds the remainder up to an hour', quoteRental(config, { hours: 12.5 }).unitPrice, 32)

// --- quantity and surcharges -------------------------------------------------
const three = quoteRental(config, { hours: 6, quantity: 3 })
eq('3 bikes multiply the unit price', three.subtotal, 54)
eq('no surcharge midweek', three.total, 54)

const weekend = quoteRental(config, { hours: 6, quantity: 3, weekend: true, delivery: true })
eq('weekend adds 10 percent', weekend.weekendSurcharge, 5.4)
eq('delivery is flat, not per bike', weekend.deliveryFee, 15)
eq('weekend total', weekend.total, 74.4)

// --- clamping ----------------------------------------------------------------
const stepped = toPricingConfig({ hourlyRate: 5, minHours: 1, maxHours: 8, hourStep: 0.5, bands: [] })
eq('snaps to the half-hour step', clampHours(stepped, 2.3), 2.5)
eq('clamps below the minimum', clampHours(stepped, 0.2), 1)
eq('clamps above the maximum', clampHours(stepped, 99), 8)
eq('half-hour rentals price correctly', quoteRental(stepped, { hours: 2.5 }).unitPrice, 12.5)

// --- entry price and presets -------------------------------------------------
eq('entry price is the hourly rate here', entryPrice(config), 6)
eq('entry price ignores hourly in bands mode', entryPrice(toPricingConfig({
  pricingMode: 'bands', hourlyRate: 2, bands: BANDS })), 18)
eq('presets are min plus every package', presetHours(config), [1, 6, 12, 168])

// --- empty records -----------------------------------------------------------
const empty = toPricingConfig({})
eq('an unpriced bike quotes nothing', quoteRental(empty, { hours: 4 }).basis, null)
eq('an unpriced bike has no entry price', entryPrice(empty), null)
eq('an unpriced bike totals zero, not NaN', quoteRental(empty, { hours: 4 }).total, 0)

// --- duration labels ---------------------------------------------------------
const L = { hour: 'h', minute: 'm', day: 'day', days: 'days' }
eq('formats whole hours', formatDuration(3, L), '3h')
eq('formats half hours', formatDuration(1.5, L), '1h 30m')
eq('formats a day', formatDuration(24, L), '1 day')
eq('formats a week', formatDuration(168, L), '7 days')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
