/**
 * The rental time-pricing engine.
 *
 * Deliberately a plain module with no imports: the planner runs it on every keystroke
 * in the browser, the listing card runs it on the server to print a "from" price, and
 * the test suite runs it under bare node. Anything pulled in here would be paid for in
 * all three places.
 *
 * The rule it encodes, in one sentence: a customer asking for N hours is quoted the
 * cheapest legitimate way to give them N hours, never merely the obvious one.
 *
 * That matters because a duration ladder is not monotonic in the way a naive lookup
 * assumes. With a $6 hourly rate and an $18 half-day package covering six hours,
 * someone asking for five hours should be charged $18 — the package they did not ask
 * for is cheaper than the hours they did. Quoting $30 there is not a rounding
 * difference, it is overcharging a customer who can see both numbers on the same page.
 */

export type PricingMode = 'both' | 'bands' | 'hourly'

export type RentalBand = {
  durationLabel: string
  durationHours: number
  price: number
  popular?: boolean
  note?: string
}

/** Everything the CMS lets an editor set about how a bike is charged by time. */
export type RentalPricingConfig = {
  pricingMode: PricingMode
  hourlyRate: number | null
  extraHourRate: number | null
  minHours: number
  maxHours: number
  hourStep: number
  bands: RentalBand[]
  deliveryFee: number | null
  weekendSurchargePct: number | null
}

export type RentalQuoteInput = {
  hours: number
  quantity?: number
  /** Friday or Saturday, which is when the weekend surcharge applies in Egypt. */
  weekend?: boolean
  delivery?: boolean
}

/** How the cheapest price was arrived at — the planner shows this back to the visitor. */
export type RentalBasis =
  | { kind: 'hourly'; hours: number }
  | { kind: 'band'; band: RentalBand }
  | { kind: 'band-plus-hours'; band: RentalBand; extraHours: number }
  | { kind: 'band-multiple'; band: RentalBand; units: number }

export type RentalQuote = {
  /** Price for one bike, before quantity and surcharges. */
  unitPrice: number
  quantity: number
  subtotal: number
  weekendSurcharge: number
  deliveryFee: number
  total: number
  basis: RentalBasis | null
  /** Difference against paying the plain hourly rate, when that would have cost more. */
  savingVsHourly: number
}

const DEFAULTS = {
  minHours: 1,
  maxHours: 24,
  hourStep: 1,
} as const

const isPositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

const numberOrNull = (value: unknown): number | null => (isPositive(value) ? value : null)

/** Money is compared and stored to the cent; floating point drift is not a discount. */
const round = (value: number): number => Math.round(value * 100) / 100

/**
 * Normalises whatever the CMS holds into a config the maths can trust.
 *
 * Every field here is optional in the admin — a half-filled bike is a normal state
 * mid-edit — so this is where missing, zero and nonsensical values become defaults
 * rather than `NaN` in a price the customer reads.
 */
export const toPricingConfig = (raw: {
  pricingMode?: string | null
  hourlyRate?: number | null
  extraHourRate?: number | null
  minHours?: number | null
  maxHours?: number | null
  hourStep?: number | null
  bands?: RentalBand[] | null
  deliveryFee?: number | null
  weekendSurchargePct?: number | null
}): RentalPricingConfig => {
  const bands = (raw.bands ?? [])
    .filter((band) => isPositive(band?.durationHours) && isPositive(band?.price))
    // Ascending, so "the longest package within budget" is simply the last match.
    .sort((a, b) => a.durationHours - b.durationHours)

  const mode: PricingMode =
    raw.pricingMode === 'bands' || raw.pricingMode === 'hourly' ? raw.pricingMode : 'both'

  const hourlyRate = numberOrNull(raw.hourlyRate)

  /**
   * A bike set to 'hourly' with no hourly rate would quote nothing at all, and one set
   * to 'both' with only packages would offer a slider that never changes the price.
   * Both are editor mistakes with a sensible reading, so the effective mode follows
   * what the record can actually price rather than what the select says.
   */
  const effectiveMode: PricingMode =
    !hourlyRate && bands.length ? 'bands' : !bands.length && hourlyRate ? 'hourly' : mode

  const minHours = numberOrNull(raw.minHours) ?? DEFAULTS.minHours
  const longestBand = bands.length ? bands[bands.length - 1].durationHours : 0

  return {
    pricingMode: effectiveMode,
    hourlyRate,
    extraHourRate: numberOrNull(raw.extraHourRate),
    minHours,
    // The ceiling must at least reach the longest package, or the ladder's own top
    // rung sits outside the range the planner will let anyone select.
    maxHours: Math.max(numberOrNull(raw.maxHours) ?? DEFAULTS.maxHours, longestBand, minHours),
    hourStep: numberOrNull(raw.hourStep) ?? DEFAULTS.hourStep,
    bands,
    deliveryFee: numberOrNull(raw.deliveryFee),
    weekendSurchargePct: numberOrNull(raw.weekendSurchargePct),
  }
}

/** The plain hourly cost, or null when this bike is not sold by the hour. */
const hourlyCost = (config: RentalPricingConfig, hours: number): number | null =>
  config.pricingMode !== 'bands' && config.hourlyRate ? round(config.hourlyRate * hours) : null

/**
 * The cheapest single package that covers the whole duration.
 *
 * "Covers" is the point: a four-hour ask is satisfied by any package of four hours or
 * more, and the ladder is sorted, so the first match is also the cheapest — provided
 * the ladder itself is priced sanely. It may not be, so the whole tail is scanned.
 */
const coveringBand = (config: RentalPricingConfig, hours: number): RentalBand | null => {
  let best: RentalBand | null = null
  for (const band of config.bands) {
    if (band.durationHours + 1e-9 < hours) continue
    if (!best || band.price < best.price) best = band
  }
  return best
}

/**
 * The longest package that fits inside the duration, plus the remainder by the hour.
 *
 * This is what keeps a nine-hour ask from jumping to the full-day price when a half
 * day plus three hours is cheaper, and it is the only branch that can price a duration
 * longer than the ladder's top rung at all.
 */
const bandPlusHours = (
  config: RentalPricingConfig,
  hours: number,
): { price: number; band: RentalBand; extraHours: number } | null => {
  const rate = config.extraHourRate ?? config.hourlyRate
  if (!rate) return null

  let best: { price: number; band: RentalBand; extraHours: number } | null = null

  for (const band of config.bands) {
    if (band.durationHours > hours + 1e-9) continue
    // Part-hours over a package are billed as whole hours: the bike is out of the
    // rack for that hour either way.
    const extraHours = Math.ceil(hours - band.durationHours - 1e-9)
    if (extraHours < 0) continue

    const price = round(band.price + extraHours * rate)
    if (!best || price < best.price) best = { price, band, extraHours }
  }

  return best
}

/**
 * The longest package, repeated enough times to cover the duration.
 *
 * The branch that keeps a packages-only bike sellable past its own top rung: a shop
 * with a one-hour, half-day and full-day ladder and no hourly rate can still quote
 * three days as three full days. Without it such a bike prices a two-day ask at
 * nothing at all, which reads as free rather than as unavailable.
 */
const repeatedBand = (
  config: RentalPricingConfig,
  hours: number,
): { price: number; band: RentalBand; units: number } | null => {
  const longest = config.bands[config.bands.length - 1]
  if (!longest) return null

  const units = Math.ceil(hours / longest.durationHours - 1e-9)
  if (units < 1) return null

  return { price: round(longest.price * units), band: longest, units }
}

/** Clamps a requested duration into the range the editor allows, on its own step. */
export const clampHours = (config: RentalPricingConfig, hours: number): number => {
  const step = config.hourStep > 0 ? config.hourStep : 1
  const snapped = Math.round(hours / step) * step
  const bounded = Math.min(Math.max(snapped, config.minHours), config.maxHours)
  // One decimal is enough for half-hour steps and keeps 2.9999999 out of the label.
  return Math.round(bounded * 10) / 10
}

/**
 * Prices one rental.
 *
 * Returns `basis: null` only when the record carries no usable price at all, which the
 * UI renders as "on request" rather than as a free bike.
 */
export const quoteRental = (
  config: RentalPricingConfig,
  input: RentalQuoteInput,
  /**
   * `clamp` folds the request into the editor's min/max/step window before pricing.
   *
   * On by default, because that is what the planner needs: it is the control's own
   * bounds, and a slider should never quote a duration it cannot represent. The
   * checkout turns it off. Its duration has already been through the planner, and
   * `maxHours` carries a 24-hour default for records where the editor set nothing —
   * so clamping there would silently shorten a legitimate multi-day booking to a day
   * and charge accordingly.
   */
  { clamp = true }: { clamp?: boolean } = {},
): RentalQuote => {
  const hours = clamp ? clampHours(config, input.hours) : input.hours
  const quantity = Math.max(1, Math.round(input.quantity ?? 1))

  const options: Array<{ price: number; basis: RentalBasis }> = []

  const hourly = hourlyCost(config, hours)
  if (hourly !== null) options.push({ price: hourly, basis: { kind: 'hourly', hours } })

  const covering = coveringBand(config, hours)
  if (covering) options.push({ price: covering.price, basis: { kind: 'band', band: covering } })

  const partial = bandPlusHours(config, hours)
  if (partial) {
    options.push({
      price: partial.price,
      basis: { kind: 'band-plus-hours', band: partial.band, extraHours: partial.extraHours },
    })
  }

  const repeated = repeatedBand(config, hours)
  if (repeated) {
    options.push({
      price: repeated.price,
      basis: { kind: 'band-multiple', band: repeated.band, units: repeated.units },
    })
  }

  const cheapest = options.reduce<{ price: number; basis: RentalBasis } | null>(
    (best, option) => (!best || option.price < best.price ? option : best),
    null,
  )

  const unitPrice = cheapest ? cheapest.price : 0
  const subtotal = round(unitPrice * quantity)

  const weekendSurcharge =
    input.weekend && config.weekendSurchargePct
      ? round((subtotal * config.weekendSurchargePct) / 100)
      : 0

  const deliveryFee = input.delivery && config.deliveryFee ? config.deliveryFee : 0

  return {
    unitPrice,
    quantity,
    subtotal,
    weekendSurcharge,
    deliveryFee,
    total: round(subtotal + weekendSurcharge + deliveryFee),
    basis: cheapest?.basis ?? null,
    // Only a real saving counts: when the hourly rate is the cheapest route, or the
    // bike is not sold by the hour at all, there is nothing to boast about.
    savingVsHourly: hourly !== null && hourly > unitPrice ? round(hourly - unitPrice) : 0,
  }
}

/** The lowest price this bike can be had for — what the listing card prints. */
export const entryPrice = (config: RentalPricingConfig): number | null => {
  const candidates = [
    config.pricingMode !== 'bands' ? config.hourlyRate : null,
    ...config.bands.map((band) => band.price),
  ].filter((value): value is number => value !== null && value > 0)

  return candidates.length ? Math.min(...candidates) : null
}

/**
 * The durations worth putting in front of someone as presets.
 *
 * Every package is a preset, and when the bike is also sold by the hour the minimum is
 * added at the front — that being the cheapest possible commitment, and the one a
 * ladder of half-days and full days otherwise hides.
 */
export const presetHours = (config: RentalPricingConfig): number[] => {
  const hours = new Set<number>()
  if (config.pricingMode !== 'bands' && config.hourlyRate) hours.add(config.minHours)
  for (const band of config.bands) hours.add(band.durationHours)
  return [...hours].filter((value) => value <= config.maxHours).sort((a, b) => a - b)
}

/** "3h" / "1h 30m" / "2 days" — a duration in the shortest form that stays exact. */
export const formatDuration = (
  hours: number,
  labels: { hour: string; minute: string; day: string; days: string },
): string => {
  if (hours >= 24 && hours % 24 === 0) {
    const days = hours / 24
    return `${days} ${days === 1 ? labels.day : labels.days}`
  }

  const whole = Math.floor(hours)
  const minutes = Math.round((hours - whole) * 60)

  if (!minutes) return `${whole}${labels.hour}`
  if (!whole) return `${minutes}${labels.minute}`
  return `${whole}${labels.hour} ${minutes}${labels.minute}`
}
